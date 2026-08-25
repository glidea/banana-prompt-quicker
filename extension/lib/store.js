class Store {
    constructor() {
        this.state = {
            prompts: [],
            customPrompts: [],
            favorites: [],
            activeFilters: new Set(),
            selectedCategory: 'all',
            sortMode: 'recommend',
            keyword: '',
            categories: new Set(['全部']),
            randomMap: new Map(),
            nsfwEnabled: true,
            recentWeekEnabled: false
        };
        this.listeners = [];
    }

    subscribe(listener) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    notify() {
        this.listeners.forEach(listener => listener(this.state));
    }

    async init() {
        await Promise.all([
            this.loadPrompts(),
            this.loadFavorites(),
            this.loadSortMode(),
            this.loadNsfwSetting()
        ]);
        this.notify();
    }

    async loadPrompts() {
        let staticPrompts = [];
        if (window.PromptManager) {
            staticPrompts = await window.PromptManager.get();
        }
        const customPrompts = await this.getCustomPrompts();
        this.state.customPrompts = customPrompts;
        this.state.prompts = [...customPrompts, ...staticPrompts];

        this.updateCategories();


        this.ensureRandomValues();
    }

    async getCustomPrompts() {
        const result = await chrome.storage.local.get(['banana-custom-prompts']);
        return result['banana-custom-prompts'] || [];
    }

    async saveCustomPrompts(prompts) {
        await chrome.storage.local.set({ 'banana-custom-prompts': prompts });
        this.state.customPrompts = prompts;
        // Reload all prompts to merge
        await this.loadPrompts();
        this.notify();
    }

    async addCustomPrompt(prompt) {
        const newPrompts = [prompt, ...this.state.customPrompts];
        await this.saveCustomPrompts(newPrompts);
    }

    async updateCustomPrompt(updatedPrompt) {
        const newPrompts = this.state.customPrompts.map(p =>
            p.id === updatedPrompt.id ? updatedPrompt : p
        );
        await this.saveCustomPrompts(newPrompts);
    }

    async deleteCustomPrompt(id) {
        const newPrompts = this.state.customPrompts.filter(p => p.id !== id);
        await this.saveCustomPrompts(newPrompts);
    }

    async loadFavorites() {
        const result = await chrome.storage.local.get(['banana-favorites']);
        this.state.favorites = result['banana-favorites'] || [];
    }

    async toggleFavorite(promptId) {
        const index = this.state.favorites.indexOf(promptId);
        if (index === -1) {
            this.state.favorites.push(promptId);
        } else {
            this.state.favorites.splice(index, 1);
        }
        await chrome.storage.local.set({ 'banana-favorites': this.state.favorites });
        this.notify();
    }

    async loadSortMode() {
        const result = await chrome.storage.local.get(['banana-sort-mode']);
        this.state.sortMode = result['banana-sort-mode'] || 'recommend';
    }

    async setSortMode(mode) {
        this.state.sortMode = mode;
        await chrome.storage.local.set({ 'banana-sort-mode': mode });
        if (mode === 'random') {
            this.state.randomMap.clear();
            this.ensureRandomValues();
        }
        this.notify();
    }

    async loadNsfwSetting() {
        const result = await chrome.storage.local.get(['banana-nsfw-enabled']);
        this.state.nsfwEnabled = result['banana-nsfw-enabled'] || true;
    }

    async setNsfwEnabled(enabled) {
        this.state.nsfwEnabled = enabled;
        await chrome.storage.local.set({ 'banana-nsfw-enabled': enabled });

        // If disabling NSFW and current category is NSFW, switch to 'all'
        if (!enabled && this.state.selectedCategory === 'NSFW') {
            this.state.selectedCategory = 'all';
        }

        this.updateCategories();
        this.notify();
    }

    updateCategories() {
        this.state.categories = new Set(['全部']);
        this.state.prompts.forEach(p => {
            if (p.category) {
                // Skip NSFW category if disabled
                if (!this.state.nsfwEnabled && p.category === 'NSFW') {
                    return;
                }
                this.state.categories.add(p.category);
            }
        });
    }

    ensureRandomValues() {
        this.state.prompts.forEach(p => {
            const key = window.Utils.promptId(p);
            if (!this.state.randomMap.has(key)) {
                this.state.randomMap.set(key, Math.random());
            }
            p._randomVal = this.state.randomMap.get(key);
        });
    }

    setSearchKeyword(keyword) {
        this.state.keyword = keyword.toLowerCase();
        this.notify();
    }

    setCategory(category) {
        this.state.selectedCategory = category;
        this.notify();
    }

    setFilters(filters) {
        this.state.activeFilters = filters;
        this.notify();
    }

    setRecentWeekEnabled(enabled) {
        this.state.recentWeekEnabled = enabled;
        this.notify();
    }

    getFilteredPrompts() {
        const { prompts, keyword, selectedCategory, activeFilters, favorites, sortMode, nsfwEnabled, recentWeekEnabled } = this.state;

        const FLASH_MODE_PROMPT = {
            title: "灵光模式",
            preview: "https://cdn.jsdelivr.net/gh/glidea/banana-prompt-quicker@main/images/flash_mode.png",
            prompt: `你现在进入【灵光模式: 有灵感就够了】。请按照以下步骤辅助我完成创作：
1. 需求理解：分析我输入的粗略的想法描述（可能会包含图片）
2. 需求澄清：要求我做出细节澄清，提出 3 个你认为最重要的选择题（A/B/C/D），以明确我的生图或修图需求（例如风格、构图、光影、具体相关细节等）。请一次性列出这三个问题
3. 最终执行：等待我回答选择题后，根据我的原始描述和选择结果调用绘图工具生成图片（如果有附图，请务必作为参数传递给绘图工具，以保证一致性）

---

OK，我想要：`,
            link: "https://www.xiaohongshu.com/user/profile/5f7dc54d0000000001004afb",
            author: "Official@glidea",
            isFlash: true
        };

        // Calculate one week ago timestamp
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

        let filtered = prompts.filter(prompt => {
            const matchesSearch = !keyword ||
                prompt.title.toLowerCase().includes(keyword) ||
                prompt.prompt.toLowerCase().includes(keyword) ||
                prompt.author.toLowerCase().includes(keyword) ||
                (prompt.sub_category && prompt.sub_category.toLowerCase().includes(keyword));

            if (!matchesSearch) return false;

            if (selectedCategory !== 'all' && prompt.category !== selectedCategory) {
                return false;
            }

            // Filter NSFW content if disabled
            if (!nsfwEnabled && prompt.category === 'NSFW') {
                return false;
            }

            // Filter by recent week if enabled
            if (recentWeekEnabled) {
                if (!prompt.created) return false;
                const createdDate = new Date(prompt.created);
                if (createdDate < oneWeekAgo) return false;
            }

            if (activeFilters.size === 0) return true;

            const promptId = window.Utils.promptId(prompt);
            const isFavorite = favorites.includes(promptId);

            return Array.from(activeFilters).every(filter => {
                if (filter === 'favorite') return isFavorite;
                if (filter === 'custom') return prompt.isCustom;
                if (filter === 'generate') return prompt.mode === 'generate';
                if (filter === 'edit') return prompt.mode === 'edit';
                return false;
            });
        });

        // Sort
        // If recent week is enabled, sort by created time (newest first)
        if (recentWeekEnabled) {
            filtered.sort((a, b) => {
                const dateA = a.created ? new Date(a.created) : new Date(0);
                const dateB = b.created ? new Date(b.created) : new Date(0);
                return dateB - dateA; // Newest first
            });
            filtered.unshift(FLASH_MODE_PROMPT);
            return filtered;
        }

        const favoriteItems = [];
        const customItems = [];
        const normalItems = [];

        filtered.forEach(item => {
            const itemId = window.Utils.promptId(item);
            const isFavorite = favorites.includes(itemId);

            if (isFavorite) {
                favoriteItems.push(item);
            } else if (item.isCustom) {
                customItems.push(item);
            } else {
                normalItems.push(item);
            }
        });

        if (sortMode === 'random') {
            normalItems.sort((a, b) => a._randomVal - b._randomVal);
        }

        filtered = [...favoriteItems, ...customItems, ...normalItems];
        filtered.unshift(FLASH_MODE_PROMPT);

        return filtered;
    }
};

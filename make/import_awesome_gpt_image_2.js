const fs = require('node:fs/promises');
const path = require('node:path');

const SOURCE_REPOSITORY = 'https://github.com/freestylefly/awesome-gpt-image-2';
const SOURCE_DATA_URL = `${SOURCE_REPOSITORY}/raw/main/data/cases.json`;
const SOURCE_CDN_ROOT = 'https://cdn.jsdelivr.net/gh/freestylefly/awesome-gpt-image-2@main/data';
const SOURCE_KEY = 'awesome-gpt-image-2';

const CATEGORY_MAP = {
    'Architecture & Spaces': '工作',
    'Brand & Logos': '工作',
    'Characters & People': '有趣',
    'Charts & Infographics': '工作',
    'Documents & Publishing': '工作',
    'History & Classical Themes': '学习',
    'Illustration & Art': '有趣',
    'Other Use Cases': '有趣',
    'Photography & Realism': '生活',
    'Posters & Typography': '工作',
    'Products & E-commerce': '工作',
    'Scenes & Storytelling': '有趣',
    'UI & Interfaces': '工作'
};

const EDIT_PATTERN = /(?:uploaded|provided|attached|input|reference|source)\s+(?:image|photo|portrait)|(?:image|photo)\s+(?:provided|attached|above|below)|上传(?:的)?(?:图片|图像|照片)|提供的(?:图片|图像|照片)|附件(?:中)?(?:的)?(?:图片|图像|照片)|参考图(?:片|像)?|原图|图一|图二/i;

function inferMode(prompt) {
    return EDIT_PATTERN.test(prompt) ? 'edit' : 'generate';
}

function mapCategory(category) {
    return CATEGORY_MAP[category] || '有趣';
}

function previewUrl(image) {
    if (!image) return '';
    if (/^https?:\/\//.test(image)) return image;
    return `${SOURCE_CDN_ROOT}/${image.replace(/^\/?(?:data\/)?/, '')}`;
}

function normalizeAuthor(sourceLabel) {
    if (!sourceLabel) return 'freestylefly/awesome-gpt-image-2';

    const unescaped = sourceLabel.replace(/\\/g, '');
    const markdownLabel = unescaped.match(/\[([^\]]+)\]/);
    return markdownLabel ? markdownLabel[1] : unescaped;
}

function sourceLink(item) {
    if (item.sourceUrl) return item.sourceUrl;

    const embeddedUrl = (item.sourceLabel || '').match(/https?:\/\/[^>\s)]+/);
    return embeddedUrl?.[0] || item.githubUrl || `${SOURCE_REPOSITORY}#case-${item.id}`;
}

function transformCase(item) {
    const prompt = {
        title: item.title,
        preview: previewUrl(item.image),
        prompt: item.prompt,
        author: normalizeAuthor(item.sourceLabel),
        link: sourceLink(item),
        mode: inferMode(item.prompt || ''),
        category: mapCategory(item.category),
        sub_category: item.category || undefined,
        source: SOURCE_KEY,
        source_id: item.id
    };

    return Object.fromEntries(Object.entries(prompt).filter(([, value]) => value !== undefined && value !== ''));
}

function mergePrompts(existingPrompts, sourceCases) {
    const retained = existingPrompts.filter((prompt) => prompt.source !== SOURCE_KEY);
    const imported = sourceCases.map(transformCase);
    return [...imported, ...retained];
}

function validateCases(cases) {
    if (!Array.isArray(cases) || cases.length === 0) {
        throw new Error('Source data must contain a non-empty cases array');
    }

    const ids = new Set();
    for (const item of cases) {
        if (!item.id || !item.title || !item.prompt || !item.image) {
            throw new Error(`Source case is missing a required field: ${JSON.stringify(item)}`);
        }
        if (ids.has(item.id)) {
            throw new Error(`Duplicate source case id: ${item.id}`);
        }
        ids.add(item.id);
    }
}

async function importPrompts({ promptsPath, fetchImpl = fetch }) {
    const [existingJson, response] = await Promise.all([
        fs.readFile(promptsPath, 'utf8'),
        fetchImpl(SOURCE_DATA_URL)
    ]);

    if (!response.ok) {
        throw new Error(`Failed to fetch source prompts: HTTP ${response.status}`);
    }

    const sourceData = await response.json();
    validateCases(sourceData.cases);

    const existingPrompts = JSON.parse(existingJson);
    if (!Array.isArray(existingPrompts)) {
        throw new Error('prompts.json must contain an array');
    }

    const merged = mergePrompts(existingPrompts, sourceData.cases);
    await fs.writeFile(promptsPath, `${JSON.stringify(merged, null, 4)}\n`);

    return {
        imported: sourceData.cases.length,
        retained: existingPrompts.filter((prompt) => prompt.source !== SOURCE_KEY).length,
        total: merged.length
    };
}

async function main() {
    const promptsPath = path.resolve(__dirname, '..', 'prompts.json');
    const result = await importPrompts({ promptsPath });
    console.log(`Imported ${result.imported} prompts from ${SOURCE_KEY}; ${result.total} prompts total.`);
}

if (require.main === module) {
    main().catch((error) => {
        console.error(error.message);
        process.exitCode = 1;
    });
}

module.exports = {
    SOURCE_KEY,
    inferMode,
    mapCategory,
    mergePrompts,
    normalizeAuthor,
    previewUrl,
    sourceLink,
    transformCase,
    validateCases
};

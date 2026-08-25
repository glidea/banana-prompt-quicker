window.UI = window.UI || {};

window.UI.Card = {
    create(prompt, options = {}) {
        const {
            favorites = [],
            theme = 'light',
            colors,
            mobile,
            onInsert,
            onToggleFavorite,
            onEdit,
            onDelete
        } = options;

        const { h } = window.DOM;
        const promptId = window.Utils.promptId(prompt);
        const isFavorite = favorites.includes(promptId);

        const cardStyle = `
            background: ${colors.surface}; 
            border-radius: 16px; 
            border: 1px solid ${colors.border}; 
            cursor: pointer; 
            overflow: hidden; 
            transition: all 0.3s ease; 
            min-height: ${mobile ? '240px' : '260px'}; 
            position: relative; 
            touch-action: manipulation; 
            display: flex; 
            flex-direction: column;
        `;

        const card = h('div', {
            className: 'prompt-card',
            style: cardStyle,
            onmouseenter: () => {
                if (!mobile) {
                    card.style.boxShadow = `0 8px 24px ${colors.shadow}`;
                    card.style.transform = 'translateY(-4px)';
                }
            },
            onmouseleave: () => {
                if (!mobile) {
                    card.style.boxShadow = 'none';
                    card.style.transform = 'translateY(0)';
                }
            }
        });

        // Image
        const img = h('img', {
            src: prompt.preview,
            alt: prompt.title,
            style: `width: 100%; height: ${mobile ? '180px' : '200px'}; object-fit: cover; flex-shrink: 0;`,
            onclick: () => onInsert(prompt)
        });

        // Favorite Button
        const favBtnBg = isFavorite
            ? 'rgba(255,193,7,0.9)'
            : theme === 'dark' ? 'rgba(48,49,52,0.9)' : 'rgba(255,255,255,0.9)';
        const favBtnColor = isFavorite
            ? '#000'
            : theme === 'dark' ? '#e8eaed' : '#5f6368';

        const favBtn = h('button', {
            style: `
                position: absolute; top: 12px; right: 12px; 
                width: ${mobile ? '36px' : '32px'}; height: ${mobile ? '36px' : '32px'}; 
                border-radius: 50%; border: none; background: ${favBtnBg}; color: ${favBtnColor}; 
                font-size: ${mobile ? '16px' : '14px'}; cursor: pointer; 
                display: flex; align-items: center; justify-content: center; 
                transition: all 0.25s ease; box-shadow: 0 4px 12px rgba(0,0,0,0.15); 
                backdrop-filter: blur(10px); touch-action: manipulation;
            `,
            onclick: (e) => {
                e.stopPropagation();
                onToggleFavorite(promptId);
            },
            onmouseenter: () => {
                if (!mobile) {
                    favBtn.style.transform = 'scale(1.15)';
                    favBtn.style.boxShadow = '0 6px 16px rgba(0,0,0,0.25)';
                }
            },
            onmouseleave: () => {
                if (!mobile) {
                    favBtn.style.transform = 'scale(1)';
                    favBtn.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                }
            }
        }, isFavorite ? '⭐' : '☆');

        // Content Area
        const content = h('div', {
            style: 'padding: 12px; flex: 1; display: flex; flex-direction: column; gap: 8px; justify-content: flex-start; min-height: 0; overflow: hidden;'
        });

        const title = h('h3', {
            style: `font-size: ${mobile ? '15px' : '14px'}; font-weight: 500; color: ${colors.text}; margin: 0; line-height: 1.4; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;`,
            onclick: () => onInsert(prompt)
        }, prompt.title);

        const bottomRow = h('div', {
            style: 'display: flex; justify-content: space-between; align-items: center; margin-top: 4px;'
        });

        // Author
        const author = h('span', {
            style: `font-size: ${mobile ? '13px' : '12px'}; color: ${colors.textSecondary}; font-weight: 400; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; margin-right: 8px;`,
            onclick: (e) => {
                if (prompt.link) {
                    e.stopPropagation();
                    window.open(prompt.link, '_blank');
                } else {
                    onInsert(prompt);
                }
            },
            title: prompt.link ? '点击查看原贴' : ''
        }, prompt.author);
        if (prompt.link) author.style.textDecoration = 'underline';

        // Tags
        let tagText = '文生图';
        let tagBg = '';
        let tagColor = '';

        if (prompt.isFlash) {
            tagText = '万能';
            tagBg = theme === 'dark' ? 'rgba(168, 85, 247, 0.15)' : 'rgba(147, 51, 234, 0.12)';
            tagColor = theme === 'dark' ? '#a855f7' : '#9333ea';
        } else {
            const isEdit = prompt.mode === 'edit';
            tagText = isEdit ? '编辑' : '文生图';
            tagBg = theme === 'dark'
                ? (isEdit ? 'rgba(10, 132, 255, 0.15)' : 'rgba(48, 209, 88, 0.15)')
                : (isEdit ? 'rgba(0, 122, 255, 0.12)' : 'rgba(52, 199, 89, 0.12)');
            tagColor = theme === 'dark'
                ? (isEdit ? '#0a84ff' : '#30d158')
                : (isEdit ? '#007aff' : '#34c759');
        }

        const modeTag = h('span', {
            style: `background: ${tagBg}; color: ${tagColor}; padding: 4px 10px; border-radius: 12px; font-size: ${mobile ? '12px' : '11px'}; font-weight: 600; backdrop-filter: blur(10px); flex-shrink: 0;`
        }, tagText);

        bottomRow.appendChild(author);

        if (prompt.sub_category) {
            const subTagBg = theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)';
            const subTag = h('span', {
                style: `background: ${subTagBg}; color: ${colors.textSecondary}; padding: 4px 10px; border-radius: 12px; font-size: ${mobile ? '12px' : '11px'}; font-weight: 600; margin-right: 6px; flex-shrink: 0; backdrop-filter: blur(10px);`
            }, prompt.sub_category);
            bottomRow.appendChild(subTag);
        }

        bottomRow.appendChild(modeTag);
        content.appendChild(title);
        content.appendChild(bottomRow);

        // Custom Prompt Buttons (Edit/Delete)
        if (prompt.isCustom) {
            const btnBg = theme === 'dark' ? 'rgba(48,49,52,0.9)' : 'rgba(255,255,255,0.9)';
            const btnColor = theme === 'dark' ? '#e8eaed' : '#5f6368';

            const editBtn = h('button', {
                title: '编辑',
                style: `position: absolute; top: 12px; left: 12px; width: ${mobile ? '36px' : '32px'}; height: ${mobile ? '36px' : '32px'}; border-radius: 50%; border: none; background: ${btnBg}; color: ${btnColor}; font-size: 14px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.25s ease; z-index: 2; backdrop-filter: blur(10px); box-shadow: 0 4px 12px rgba(0,0,0,0.15);`,
                innerHTML: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`,
                onclick: (e) => {
                    e.stopPropagation();
                    onEdit(prompt);
                }
            });

            const deleteBtn = h('button', {
                title: '删除',
                style: `position: absolute; top: 12px; left: ${mobile ? '56px' : '48px'}; width: ${mobile ? '36px' : '32px'}; height: ${mobile ? '36px' : '32px'}; border-radius: 50%; border: none; background: ${btnBg}; color: ${btnColor}; font-size: 14px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.25s ease; z-index: 2; backdrop-filter: blur(10px); box-shadow: 0 4px 12px rgba(0,0,0,0.15);`,
                innerHTML: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>`,
                onclick: (e) => {
                    e.stopPropagation();
                    if (confirm('确定要删除这个 Prompt 吗？')) {
                        onDelete(prompt.id);
                    }
                }
            });

            card.appendChild(editBtn);
            card.appendChild(deleteBtn);
        }

        card.appendChild(img);
        card.appendChild(favBtn);
        card.appendChild(content);

        return card;
    }
};

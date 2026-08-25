const test = require('node:test');
const assert = require('node:assert/strict');

const {
    SOURCE_KEY,
    inferMode,
    mapCategory,
    mergePrompts,
    normalizeAuthor,
    previewUrl,
    sourceLink,
    transformCase,
    validateCases
} = require('../make/import_awesome_gpt_image_2');

const sourceCase = {
    id: 42,
    title: '测试海报',
    image: '/images/case42.jpg',
    prompt: 'Create a clean poster',
    sourceLabel: '@creator',
    sourceUrl: 'https://example.com/source',
    githubUrl: 'https://github.com/example/repo#case-42',
    category: 'Posters & Typography'
};

test('transforms source cases into banana prompts with attribution', () => {
    assert.deepEqual(transformCase(sourceCase), {
        title: '测试海报',
        preview: 'https://cdn.jsdelivr.net/gh/freestylefly/awesome-gpt-image-2@main/data/images/case42.jpg',
        prompt: 'Create a clean poster',
        author: '@creator',
        link: 'https://example.com/source',
        mode: 'generate',
        category: '工作',
        sub_category: 'Posters & Typography',
        source: SOURCE_KEY,
        source_id: 42
    });
});

test('detects prompts that require an input image', () => {
    assert.equal(inferMode('Transform the uploaded photo into a watercolor painting'), 'edit');
    assert.equal(inferMode('根据参考图生成同风格角色'), 'edit');
    assert.equal(inferMode('Create a watercolor landscape'), 'generate');
});

test('maps source categories and normalizes image paths', () => {
    assert.equal(mapCategory('History & Classical Themes'), '学习');
    assert.equal(mapCategory('Unknown'), '有趣');
    assert.equal(previewUrl('data/images/case1.jpg'), 'https://cdn.jsdelivr.net/gh/freestylefly/awesome-gpt-image-2@main/data/images/case1.jpg');
});

test('normalizes malformed Markdown attribution without losing its source URL', () => {
    const item = {
        id: 270,
        sourceLabel: '\\[OpenNana]\\(]\\(\u003chttps://x.com/example/status/1\u003e)',
        githubUrl: 'https://github.com/example/repo#case-270'
    };

    assert.equal(normalizeAuthor(item.sourceLabel), 'OpenNana');
    assert.equal(sourceLink(item), 'https://x.com/example/status/1');
});

test('re-import replaces prior source entries without duplicating native prompts', () => {
    const nativePrompt = { title: 'Native', source: 'another-source' };
    const oldImport = { title: 'Old', source: SOURCE_KEY, source_id: 42 };
    const merged = mergePrompts([nativePrompt, oldImport], [sourceCase]);

    assert.equal(merged.length, 2);
    assert.equal(merged[0].title, sourceCase.title);
    assert.equal(merged[1], nativePrompt);
});

test('rejects invalid and duplicate source cases', () => {
    assert.throws(() => validateCases([]), /non-empty cases array/);
    assert.throws(() => validateCases([{ ...sourceCase }, { ...sourceCase }]), /Duplicate source case id/);
    assert.throws(() => validateCases([{ ...sourceCase, prompt: '' }]), /missing a required field/);
});

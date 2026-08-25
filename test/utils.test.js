const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const context = { window: {} };
vm.runInNewContext(fs.readFileSync('extension/lib/utils.js', 'utf8'), context);

test('uses source metadata for stable imported prompt ids', () => {
    assert.equal(
        context.window.Utils.promptId({
            title: 'Duplicate title',
            author: '@author',
            source: 'awesome-gpt-image-2',
            source_id: 42
        }),
        'awesome-gpt-image-2:42'
    );
});

test('preserves legacy ids for native and custom prompts', () => {
    assert.equal(
        context.window.Utils.promptId({ title: 'Native prompt', author: 'Official' }),
        'Native prompt-Official'
    );
});

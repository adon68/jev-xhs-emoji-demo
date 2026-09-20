#!/usr/bin/env node

/**
 * 表情贴纸映射验证脚本
 * 
 * 验证：
 * 1. map.json、atlas.json、EMOJI_CRITERIA 三者一致性
 * 2. choiceToSticker 映射的正确性
 * 3. 关键贴纸的语义描述
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 开始验证表情贴纸映射...\n');

// 1. 读取所有配置文件
const map = JSON.parse(fs.readFileSync('public/xhs-small/map.json', 'utf8'));
const atlas = JSON.parse(fs.readFileSync('public/sprites/atlas.json', 'utf8'));
const serverContent = fs.readFileSync('server.js', 'utf8');
const htmlContent = fs.readFileSync('public/index.html', 'utf8');

// 2. 提取 EMOJI_CRITERIA
const criteriaMatch = serverContent.match(/const EMOJI_CRITERIA = \{([\s\S]+?)\n\};/);
if (!criteriaMatch) {
  console.error('❌ 无法提取 EMOJI_CRITERIA');
  process.exit(1);
}

const criteriaBlock = criteriaMatch[1];
const criteriaLines = criteriaBlock.split('\n');
const criteria = {};
for (const line of criteriaLines) {
  const m = line.match(/^\s*'([^']+)':\s*'([^']+)'/);
  if (m) {
    criteria[m[1]] = m[2];
  }
}

// 3. 提取 choiceToSticker
const choiceMatch = htmlContent.match(/const choiceToSticker = \{([^}]+)\};/);
if (!choiceMatch) {
  console.error('❌ 无法提取 choiceToSticker');
  process.exit(1);
}

const choiceStr = choiceMatch[0];
const choiceToSticker = {};
const regex = /'([^']+)':'([^']+)'/g;
let m;
while ((m = regex.exec(choiceStr)) !== null) {
  choiceToSticker[m[1]] = m[2];
}

// 4. 提取所有贴纸名称
const mapNames = new Set(map.items.map(x => x.name));
const atlasNames = new Set(atlas.items.map(x => x.name));
const criteriaKeys = Object.keys(criteria).filter(k => k !== 'none');

console.log('📊 统计信息：');
console.log(`  - map.json: ${mapNames.size} 个贴纸`);
console.log(`  - atlas.json: ${atlasNames.size} 个贴纸`);
console.log(`  - EMOJI_CRITERIA: ${criteriaKeys.length} 个条目（不含none）`);
console.log(`  - choiceToSticker: ${Object.keys(choiceToSticker).length} 个映射\n`);

// 5. 一致性检查
let hasError = false;

console.log('✅ 一致性检查：');

// criteria vs map
const missingInMap = criteriaKeys.filter(k => !mapNames.has(k));
if (missingInMap.length > 0) {
  console.error(`  ❌ 在 criteria 但不在 map: ${missingInMap.join(', ')}`);
  hasError = true;
} else {
  console.log('  ✓ criteria 的所有 key 都在 map 中');
}

// map vs atlas
const mapNotInAtlas = [...mapNames].filter(n => !atlasNames.has(n));
if (mapNotInAtlas.length > 0) {
  console.error(`  ❌ 在 map 但不在 atlas: ${mapNotInAtlas.join(', ')}`);
  hasError = true;
} else {
  console.log('  ✓ map 的所有贴纸都在 atlas 中');
}

// choiceToSticker 目标验证
const invalidMappings = Object.entries(choiceToSticker).filter(([_, name]) => !mapNames.has(name));
if (invalidMappings.length > 0) {
  console.error('  ❌ choiceToSticker 中的无效映射:');
  invalidMappings.forEach(([emoji, name]) => {
    console.error(`     '${emoji}' -> '${name}' (贴纸不存在)`);
  });
  hasError = true;
} else {
  console.log('  ✓ choiceToSticker 的所有目标贴纸都存在');
}

console.log('');

// 6. 关键贴纸语义检查
console.log('🎯 关键贴纸语义验证：');

const keyStickers = {
  '火': 'Fire, hot, trending, hype energy',
  '火箭': 'Rocket launch, takeoff energy, rapid growth',
  '飞机': 'Airplane travel, flying, boarding a flight, airport trip',
  '心心眼': 'Heart eyes loving something a lot',
  '超喜欢': 'Really really like love this',
  '微笑': 'Polite mild smile, everyday friendly warmth',
};

for (const [name, expectedCriteria] of Object.entries(keyStickers)) {
  const actual = criteria[name];
  if (!actual) {
    console.error(`  ❌ 贴纸 '${name}' 在 criteria 中不存在`);
    hasError = true;
  } else if (actual !== expectedCriteria) {
    console.warn(`  ⚠️  贴纸 '${name}' criteria 不匹配:`);
    console.warn(`     期望: ${expectedCriteria}`);
    console.warn(`     实际: ${actual}`);
  } else {
    console.log(`  ✓ '${name}': ${actual}`);
  }
}

console.log('');

// 7. choiceToSticker 关键映射验证
console.log('🔥 choiceToSticker 关键映射验证：');

const keyMappings = {
  '🔥': '火',
  '🚀': '火箭',
  '✈️': '飞机',
  '❤️': '心心眼',
  '😍': '心心眼',
};

for (const [emoji, expectedName] of Object.entries(keyMappings)) {
  const actual = choiceToSticker[emoji];
  if (!actual) {
    console.warn(`  ⚠️  emoji '${emoji}' 没有映射（可能依赖 API 直接返回贴纸名）`);
  } else if (actual !== expectedName) {
    console.error(`  ❌ emoji '${emoji}' 映射错误: '${actual}' (期望 '${expectedName}')`);
    hasError = true;
  } else {
    console.log(`  ✓ '${emoji}' -> '${actual}'`);
  }
}

console.log('');

// 8. 文件存在性检查（抽查）
console.log('📁 文件存在性抽查：');
const samplesToCheck = ['火', '火箭', '飞机', '心心眼', 'doge'];
for (const name of samplesToCheck) {
  const filePath = `public/xhs-small/${name}.png`;
  if (fs.existsSync(filePath)) {
    console.log(`  ✓ ${filePath}`);
  } else {
    console.error(`  ❌ ${filePath} 不存在`);
    hasError = true;
  }
}

console.log('');

// 9. 总结
if (hasError) {
  console.error('❌ 验证失败，请修复上述问题\n');
  process.exit(1);
} else {
  console.log('✅ 所有验证通过！\n');
  console.log('建议测试场景：');
  console.log('  1. "这个视频火了" -> 应显示 火 贴纸');
  console.log('  2. "今天坐飞机去上海" -> 应显示 飞机 贴纸');
  console.log('  3. "我很有爱心" -> 应显示 心心眼 或 超喜欢 贴纸');
  console.log('  4. "销量火箭般上升" -> 应显示 火箭 贴纸\n');
  process.exit(0);
}

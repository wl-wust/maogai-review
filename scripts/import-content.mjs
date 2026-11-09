import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourcePath = path.join(root, '.tmp', '题库.txt');

const chapters = [
  { id: 'intro', title: '绪论  马克思主义中国化时代化的历史进程与理论成果', shortTitle: '绪论' },
  { id: 'chapter1', title: '第1章  毛泽东思想及其历史地位', shortTitle: '第1章 毛泽东思想' },
  { id: 'chapter2', title: '第2章  新民主主义革命理论', shortTitle: '第2章 新民主主义革命' },
  { id: 'chapter3', title: '第3章  社会主义改造理论', shortTitle: '第3章 社会主义改造' },
  { id: 'chapter4', title: '第4章  社会主义建设道路初步探索', shortTitle: '第4章 初步探索' },
  { id: 'chapter5', title: '第5章  中国特色社会主义理论体系', shortTitle: '第5章 理论体系' },
  { id: 'chapter6', title: '第6章  邓小平理论', shortTitle: '第6章 邓小平理论' },
  { id: 'chapter7', title: '第7章  “三个代表”重要思想', shortTitle: '第7章 “三个代表”' },
  { id: 'chapter8', title: '第8章  科学发展观', shortTitle: '第8章 科学发展观' }
];

const typeMap = {
  单选题: 'single',
  多选题: 'multiple',
  判断题: 'judge'
};

function cleanLine(line) {
  return line.replace(/^\[\d{4}\]\s*<[^>]+>\s*/, '').trim();
}

function parseOptions(lines) {
  const options = [];
  for (const line of lines) {
    const combined = line.match(/^A\.\s*(.+?)\s+B\.\s*(.+)$/);
    if (combined) {
      options.push({ key: 'A', text: combined[1].trim() });
      options.push({ key: 'B', text: combined[2].trim() });
      continue;
    }
    const match = line.match(/^([A-E])\.\s*(.+)$/);
    if (match) options.push({ key: match[1], text: match[2].trim() });
  }
  return options;
}

function normalizeJudgeAnswer(answer) {
  if (answer === '对' || answer === '正确') return 'A';
  if (answer === '错' || answer === '错误') return 'B';
  return answer;
}

async function parseQuestions() {
  const raw = await readFile(sourcePath, 'utf8');
  const lines = raw.split(/\r?\n/).map(cleanLine).filter(Boolean);
  const questions = [];
  let currentChapter = null;
  let current = null;

  const pushCurrent = () => {
    if (!current) return;
    const options = parseOptions(current.body);
    const answerLine = current.body.find((line) => line.startsWith('【答案】'));
    const explainLine = current.body.find((line) => line.startsWith('【解析】'));
    if (!answerLine || !explainLine || !options.length) {
      throw new Error(`第 ${current.number} 题结构不完整`);
    }
    const rawAnswer = answerLine.replace('【答案】', '').trim().toUpperCase();
    questions.push({
      id: `q${String(current.number).padStart(3, '0')}`,
      number: current.number,
      chapterId: current.chapterId,
      chapter: current.chapter,
      type: current.type,
      stem: current.stem,
      options,
      answer: current.type === 'judge' ? normalizeJudgeAnswer(rawAnswer) : rawAnswer.replace(/\s/g, ''),
      explanation: explainLine.replace('【解析】', '').trim()
    });
    current = null;
  };

  for (const line of lines) {
    if (/\d+—\d+题/.test(line) && /^(绪论|第[1-8]章)/.test(line)) {
      pushCurrent();
      const chapterNumber = line.startsWith('绪论')
        ? 'intro'
        : `chapter${line.match(/^第([1-8])章/)[1]}`;
      currentChapter = chapters.find((item) => item.id === chapterNumber);
      continue;
    }

    const match = line.match(/^(\d+)\.（(单选题|多选题|判断题)）(.+)$/);
    if (match) {
      pushCurrent();
      if (!currentChapter) throw new Error(`第 ${match[1]} 题缺少章节`);
      current = {
        number: Number(match[1]),
        type: typeMap[match[2]],
        stem: match[3].trim(),
        chapterId: currentChapter.id,
        chapter: currentChapter.shortTitle,
        body: []
      };
      continue;
    }

    if (current) current.body.push(line);
  }

  pushCurrent();
  questions.sort((a, b) => a.number - b.number);
  return questions;
}

const subjective = [
  {
    id: 's01',
    chapterId: 'intro',
    chapter: '绪论',
    question: '马克思主义中国化时代化经历了哪四个历史时期？各时期的理论成果和意义是什么？',
    points: [
      '新民主主义革命时期（1921—1949）：形成毛泽东思想，开辟农村包围城市、武装夺取政权的革命道路，实现马克思主义中国化时代化第一次历史性飞跃。',
      '社会主义革命和建设时期（1949—1978）：建立社会主义基本制度，探索适合中国的社会主义建设道路，丰富发展毛泽东思想，为中华民族伟大复兴奠定根本政治前提和制度基础。',
      '改革开放和社会主义现代化建设新时期（1978—2012）：形成邓小平理论、“三个代表”重要思想、科学发展观，构成中国特色社会主义理论体系，推进中华民族从站起来到富起来的伟大飞跃。',
      '中国特色社会主义新时代（2012— ）：创立习近平新时代中国特色社会主义思想，坚持“两个结合”，推动中华民族迎来从站起来、富起来到强起来的伟大飞跃。'
    ],
    keywords: ['毛泽东思想', '中国特色社会主义理论体系', '习近平新时代中国特色社会主义思想', '历史性飞跃']
  },
  {
    id: 's02',
    chapterId: 'chapter1',
    chapter: '第1章 毛泽东思想',
    question: '如何科学认识毛泽东思想的历史地位？',
    points: [
      '理论层面：毛泽东思想是马克思主义中国化第一次历史性飞跃的理论成果，是马克思列宁主义在中国的创造性运用和发展，是中国特色社会主义理论体系的重要思想渊源。',
      '实践层面：毛泽东思想是中国革命和建设的科学指南，指导新民主主义革命胜利、新中国成立、社会主义改造和社会主义基本制度建设。',
      '精神层面：毛泽东思想是中国共产党和中国人民宝贵的精神财富，其立场、观点和方法具有长期指导意义。'
    ],
    keywords: ['第一次历史性飞跃', '科学指南', '精神财富', '实事求是', '群众路线', '独立自主']
  },
  {
    id: 's03',
    chapterId: 'chapter2',
    chapter: '第2章 新民主主义革命',
    question: '简述新民主主义革命的总路线。',
    points: [
      '总路线：无产阶级领导的，人民大众的，反对帝国主义、封建主义和官僚资本主义的革命。',
      '革命对象：帝国主义、封建主义和官僚资本主义。',
      '革命动力：无产阶级、农民阶级、城市小资产阶级和民族资产阶级。',
      '领导力量：无产阶级及其政党中国共产党。',
      '革命性质：资产阶级民主革命；革命前途：社会主义。'
    ],
    keywords: ['无产阶级领导', '人民大众', '三座大山', '资产阶级民主革命', '社会主义']
  },
  {
    id: 's04',
    chapterId: 'chapter2',
    chapter: '第2章 新民主主义革命',
    question: '简述新民主主义革命的基本纲领。',
    points: [
      '政治纲领：推翻帝国主义和封建主义统治，建立无产阶级领导的、以工农联盟为基础的、各革命阶级联合专政的新民主主义共和国。',
      '经济纲领：没收封建地主阶级的土地归农民所有，没收官僚资本归国家所有，保护民族工商业。',
      '文化纲领：建设无产阶级领导的、人民大众的反帝反封建文化，即民族的、科学的、大众的文化。'
    ],
    keywords: ['政治纲领', '经济纲领', '文化纲领', '民族的科学的大众的文化']
  },
  {
    id: 's05',
    chapterId: 'chapter2',
    chapter: '第2章 新民主主义革命',
    question: '如何认识中国革命走农村包围城市、武装夺取政权道路的必然性和意义？',
    points: [
      '社会性质决定：中国是半殖民地半封建社会，内无民主、外无独立，必须解决农民问题并开展土地革命。',
      '具体国情决定：中国是农业大国，农民是革命主力军，主要斗争形式只能是武装斗争。',
      '道路内容：正确处理土地革命、武装斗争和农村革命根据地建设三者关系。',
      '理论意义：开辟了不同于照搬俄国经验的正确道路，是运用马克思主义解决中国问题的光辉典范，反映了中国革命发展的客观规律。',
      '方法论意义：独创性地发展了马克思列宁主义，对推进马克思主义中国化时代化具有重要方法论意义。'
    ],
    keywords: ['半殖民地半封建社会', '农村包围城市', '武装夺取政权', '土地革命', '工农武装割据']
  },
  {
    id: 's06',
    chapterId: 'chapter2',
    chapter: '第2章 新民主主义革命',
    question: '如何理解新民主主义革命的三大法宝及其相互关系？',
    points: [
      '三大法宝：统一战线、武装斗争、党的建设。',
      '统一战线：团结一切可以团结的力量，是战胜敌人的基本武器。',
      '武装斗争：中国革命的主要斗争形式，人民军队是革命的重要支柱。',
      '党的建设：坚持思想建党，发扬三大优良作风，是革命取得胜利的根本保证。',
      '相互关系：统一战线和武装斗争是两个基本武器；党的组织是掌握这两个武器对敌冲锋陷阵的英勇战士。'
    ],
    keywords: ['统一战线', '武装斗争', '党的建设', '基本武器', '根本保证']
  },
  {
    id: 's07',
    chapterId: 'chapter2',
    chapter: '第2章 新民主主义革命',
    question: '简述新民主主义革命理论的意义。',
    points: [
      '理论层面：揭示近代中国革命发展的客观规律，解决中国革命一系列理论问题，丰富马克思主义理论宝库。',
      '实践层面：指导建立中华人民共和国，实现民族独立和人民解放，开启中国历史新纪元。',
      '世界层面：改变世界政治格局，增强世界人民反对帝国主义的信心和争取和平的力量。'
    ],
    keywords: ['客观规律', '民族独立', '人民解放', '世界政治格局']
  },
  {
    id: 's08',
    chapterId: 'chapter3',
    chapter: '第3章 社会主义改造',
    question: '如何理解中国确立社会主义基本制度的重大意义？',
    points: [
      '历史与制度意义：这是中国历史上最深刻最伟大的社会变革，为当代中国一切发展进步奠定制度基础。',
      '经济意义：调动广大劳动者积极性，解放和发展社会生产力。',
      '政治意义：劳动人民真正成为国家主人，实现中国几千年来阶级关系的最根本变革。',
      '世界意义：占世界人口四分之一的大国进入社会主义社会，改变世界格局并壮大社会主义力量。',
      '理论意义：是马克思列宁主义社会主义革命理论在中国的创造性运用和发展。'
    ],
    keywords: ['1956年底', '三大改造', '制度基础', '劳动人民', '世界社会主义']
  },
  {
    id: 's09',
    chapterId: 'chapter4',
    chapter: '第4章 初步探索',
    question: '社会主义建设道路初步探索有哪些重要理论成果？',
    points: [
      '调动一切积极因素为社会主义事业服务：1956年《论十大关系》是探索社会主义建设道路的良好开端。',
      '正确认识和处理社会主义社会矛盾：社会主义社会基本矛盾仍是生产关系和生产力、上层建筑和经济基础的矛盾，具有又相适应又相矛盾的特点。',
      '正确处理两类不同性质的矛盾：敌我矛盾用专政方法，人民内部矛盾用民主方法。',
      '走中国工业化道路：以农业为基础、以工业为主导，以农轻重为序发展国民经济。',
      '其他成果：社会主义发展阶段思想、“四个现代化”战略目标、“向科学进军”和“百花齐放、百家争鸣”。'
    ],
    keywords: ['论十大关系', '社会主义社会矛盾', '人民内部矛盾', '中国工业化道路', '四个现代化']
  },
  {
    id: 's10',
    chapterId: 'chapter6',
    chapter: '第6章 邓小平理论',
    question: '邓小平理论的主要内容有哪些？',
    points: [
      '社会主义初级阶段理论和党的基本路线，核心是“一个中心、两个基本点”。',
      '社会主义根本任务和发展战略理论，强调发展生产力、科学技术是第一生产力和“三步走”战略。',
      '社会主义改革开放和社会主义市场经济理论，明确计划和市场都是经济手段。',
      '“两手抓，两手都要硬”，一手抓物质文明、一手抓精神文明，一手抓建设、一手抓法制。',
      '“一国两制”理论、中国特色社会主义外交和国际战略理论、党的建设理论。'
    ],
    keywords: ['社会主义初级阶段', '一个中心两个基本点', '科学技术是第一生产力', '一国两制', '两手抓']
  },
  {
    id: 's11',
    chapterId: 'chapter7',
    chapter: '第7章 “三个代表”',
    question: '“三个代表”重要思想的历史地位是什么？',
    points: [
      '是中国特色社会主义理论体系的丰富发展，继承和发展马克思列宁主义、毛泽东思想、邓小平理论。',
      '是加强和改进党的建设、推进中国特色社会主义事业的强大理论武器。',
      '创造性回答建设什么样的党、怎样建设党，进一步回答什么是社会主义、怎样建设社会主义。',
      '是党和国家必须长期坚持的指导思想。'
    ],
    keywords: ['中国特色社会主义理论体系', '党的建设', '建设什么样的党', '长期坚持']
  },
  {
    id: 's12',
    chapterId: 'chapter8',
    chapter: '第8章 科学发展观',
    question: '简述科学发展观的科学内涵。',
    points: [
      '第一要义是发展：发展是硬道理，首要任务是推动经济社会发展。',
      '核心是以人为本：发展为了人民、发展依靠人民、发展成果由人民共享，促进人的全面发展。',
      '基本要求是全面协调可持续：全面推进经济、政治、文化、社会和生态文明建设。',
      '根本方法是统筹兼顾：统筹城乡、区域、经济社会、人与自然、国内国际发展，兼顾当前与长远。'
    ],
    keywords: ['第一要义是发展', '以人为本', '全面协调可持续', '统筹兼顾']
  }
].map((item) => ({
  ...item,
  answer: item.points.map((point, index) => `${index + 1}. ${point}`).join('\n')
}));

const knowledge = [
  {
    id: 'k01',
    chapterId: 'intro',
    chapter: '绪论',
    title: '马克思主义中国化时代化的四次历史进程',
    summary: '围绕四个历史时期，掌握核心任务、理论成果和历史意义。',
    content:
      '新民主主义革命时期（1921—1949）：形成毛泽东思想，开辟农村包围城市、武装夺取政权道路，实现第一次历史性飞跃。\n' +
      '社会主义革命和建设时期（1949—1978）：建立社会主义基本制度，探索社会主义建设道路，奠定根本政治前提和制度基础。\n' +
      '改革开放和社会主义现代化建设新时期（1978—2012）：形成中国特色社会主义理论体系，推进中华民族从站起来到富起来。\n' +
      '中国特色社会主义新时代（2012— ）：创立习近平新时代中国特色社会主义思想，推动中华民族走向强起来。',
    keywords: ['四个历史时期', '第一次历史性飞跃', '两个结合', '马克思主义中国化时代化']
  },
  {
    id: 'k02',
    chapterId: 'chapter1',
    chapter: '第1章 毛泽东思想',
    title: '毛泽东思想的历史地位',
    summary: '从理论、实践、精神三个层面记忆。',
    content:
      '理论层面：马克思主义中国化第一次历史性飞跃的理论成果，中国特色社会主义理论体系的重要思想渊源。\n' +
      '实践层面：中国革命和建设的科学指南，指导新民主主义革命、社会主义改造和社会主义建设。\n' +
      '精神层面：党和人民宝贵的精神财富；活的灵魂是实事求是、群众路线、独立自主。',
    keywords: ['历史地位', '活的灵魂', '实事求是', '群众路线', '独立自主']
  },
  {
    id: 'k03',
    chapterId: 'chapter2',
    chapter: '第2章 新民主主义革命',
    title: '新民主主义革命总路线与基本纲领',
    summary: '总路线记“对象、动力、领导、性质、前途”，纲领记政治、经济、文化三项。',
    content:
      '总路线：无产阶级领导的，人民大众的，反对帝国主义、封建主义和官僚资本主义的革命。\n' +
      '政治纲领：建立无产阶级领导的、以工农联盟为基础的、各革命阶级联合专政的新民主主义共和国。\n' +
      '经济纲领：没收封建地主阶级土地归农民所有，没收官僚资本归国家所有，保护民族工商业。\n' +
      '文化纲领：民族的、科学的、大众的文化。',
    keywords: ['总路线', '基本纲领', '三座大山', '工农联盟', '保护民族工商业']
  },
  {
    id: 'k04',
    chapterId: 'chapter2',
    chapter: '第2章 新民主主义革命',
    title: '农村包围城市道路与三大法宝',
    summary: '道路核心是农村包围城市、武装夺取政权；三大法宝是统一战线、武装斗争、党的建设。',
    content:
      '道路形成：早期城市中心论失败，1927年后重心转向农村，井冈山时期形成工农武装割据，1938年最终确立先乡村后城市的道路。\n' +
      '道路内容：土地革命是基本内容，武装斗争是主要形式，农村革命根据地建设是战略阵地。\n' +
      '三大法宝：统一战线、武装斗争、党的建设。统一战线和武装斗争是两个基本武器，党的建设是根本保证。',
    keywords: ['农村包围城市', '工农武装割据', '三大法宝', '统一战线', '武装斗争', '党的建设']
  },
  {
    id: 'k05',
    chapterId: 'chapter3',
    chapter: '第3章 社会主义改造',
    title: '社会主义基本制度的确立',
    summary: '从经济、政治、阶级关系三个层面掌握确立表现与重大意义。',
    content:
      '经济层面：1956年底三大改造基本完成，社会主义公有制成为经济基础。\n' +
      '政治层面：1954年第一届全国人民代表大会召开并颁布宪法，确立人民民主专政和人民代表大会制度。\n' +
      '阶级关系：剥削制度结束，工人阶级成为领导阶级，劳动人民成为国家和社会的主人。\n' +
      '重大意义：最深刻最伟大的社会变革，为当代中国发展进步奠定制度基础。',
    keywords: ['三大改造', '1956年底', '第一届全国人民代表大会', '制度基础']
  },
  {
    id: 'k06',
    chapterId: 'chapter4',
    chapter: '第4章 初步探索',
    title: '社会主义建设道路初步探索',
    summary: '重点掌握《论十大关系》、社会主义社会矛盾和中国工业化道路。',
    content:
      '调动一切积极因素：《论十大关系》标志党探索中国社会主义建设道路的良好开端。\n' +
      '社会主义社会矛盾：基本矛盾仍是生产关系与生产力、上层建筑与经济基础的矛盾；敌我矛盾用专政方法，人民内部矛盾用民主方法。\n' +
      '工业化道路：以农业为基础、以工业为主导，以农轻重为序发展国民经济，坚持“两条腿走路”。\n' +
      '其他成果：社会主义发展阶段、“四个现代化”、“向科学进军”、“百花齐放、百家争鸣”。',
    keywords: ['论十大关系', '社会主义社会矛盾', '中国工业化道路', '四个现代化']
  },
  {
    id: 'k07',
    chapterId: 'chapter6',
    chapter: '第6章 邓小平理论',
    title: '邓小平理论主要内容',
    summary: '围绕“什么是社会主义、怎样建设社会主义”形成比较完备的科学体系。',
    content:
      '社会主义初级阶段理论和党的基本路线：“一个中心、两个基本点”。\n' +
      '社会主义根本任务和发展战略：发展生产力，科学技术是第一生产力，“三步走”战略。\n' +
      '改革开放和社会主义市场经济理论：计划和市场都是经济手段。\n' +
      '“两手抓，两手都要硬”；“一国两制”；独立自主的和平外交；党的建设理论。',
    keywords: ['初级阶段', '一个中心两个基本点', '三步走', '一国两制', '社会主义市场经济']
  },
  {
    id: 'k08',
    chapterId: 'chapter7',
    chapter: '第7章 “三个代表”',
    title: '“三个代表”重要思想的历史地位',
    summary: '中国特色社会主义理论体系的丰富发展，党的建设强大理论武器。',
    content:
      '继承和发展马克思列宁主义、毛泽东思想、邓小平理论，实现党的指导思想又一次与时俱进。\n' +
      '创造性回答建设什么样的党、怎样建设党，进一步回答什么是社会主义、怎样建设社会主义。\n' +
      '是加强和改进党的建设、推进中国特色社会主义事业的强大理论武器，是党和国家必须长期坚持的指导思想。',
    keywords: ['三个代表', '党的建设', '思想武器', '长期坚持']
  },
  {
    id: 'k09',
    chapterId: 'chapter8',
    chapter: '第8章 科学发展观',
    title: '科学发展观的科学内涵',
    summary: '记四句核心：第一要义、核心立场、基本要求、根本方法。',
    content:
      '第一要义是发展。\n核心是以人为本。\n基本要求是全面协调可持续。\n根本方法是统筹兼顾。\n' +
      '以人为本体现发展为了人民、发展依靠人民、发展成果由人民共享；全面协调可持续要求推进经济、政治、文化、社会和生态文明建设。',
    keywords: ['第一要义是发展', '以人为本', '全面协调可持续', '统筹兼顾']
  },
  {
    id: 'k10',
    chapterId: 'chapter1',
    chapter: '综合材料题',
    title: '毛泽东思想在当代的发展与影响',
    summary: '用于材料分析题：毛泽东思想与中国特色社会主义理论体系一脉相承又与时俱进。',
    content:
      '核心前提：毛泽东思想是马克思主义中国化第一次历史性飞跃的理论成果。\n' +
      '活的灵魂：实事求是、群众路线、独立自主，长期指导实践。\n' +
      '继承发展：邓小平理论、“三个代表”重要思想、科学发展观、习近平新时代中国特色社会主义思想不断回答新的时代课题。\n' +
      '结论：中国特色社会主义理论体系不是另起炉灶，而是对毛泽东思想的继承和发展。',
    keywords: ['当代发展', '材料分析', '一脉相承', '与时俱进', '另起炉灶']
  }
];

await mkdir(path.join(root, 'data'), { recursive: true });

const questions = await parseQuestions();
const expected = { single: 90, multiple: 85, judge: 95 };
for (const [type, count] of Object.entries(expected)) {
  const actual = questions.filter((item) => item.type === type).length;
  if (actual !== count) throw new Error(`${type} 数量错误：${actual}，应为 ${count}`);
}

await writeFile(
  path.join(root, 'data', 'questions.js'),
  `export const chapters = ${JSON.stringify(chapters, null, 2)};\n\nexport const questions = ${JSON.stringify(questions, null, 2)};\n`,
  'utf8'
);
await writeFile(
  path.join(root, 'data', 'subjective.js'),
  `export const subjective = ${JSON.stringify(subjective, null, 2)};\n`,
  'utf8'
);
await writeFile(
  path.join(root, 'data', 'knowledge.js'),
  `export const knowledge = ${JSON.stringify(knowledge, null, 2)};\n`,
  'utf8'
);

console.log(`${questions.length} questions, ${subjective.length} subjective, ${knowledge.length} knowledge cards`);

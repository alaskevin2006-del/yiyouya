import type { Pet } from '../types';

export const mockPets: Pet[] = [
  {
    id: 'pet-mochi',
    name: '小蓝龙',
    species: '虚拟旅伴龙',
    personality: '好奇、温柔、喜欢把路上的小事讲给主人听',
    avatarUrl: '/mock-images/pet-dragon-sway.webp',
    referenceImageUrl: '/mock-images/pet-dragon-sway.webp',
    description: '会轻轻摆动的蓝色小龙，负责替主人探索世界并带回图文游记。',
    source: 'mock',
  },
  {
    id: 'pet-lumi',
    name: 'Lumi',
    species: '星光旅伴',
    personality: '安静、敏锐、擅长记录氛围和情绪',
    avatarUrl: '/mock-images/pet-lumi.png',
    referenceImageUrl: '/mock-images/pet-lumi-reference.jpg',
    description: '偏向沉浸式观察的旅伴，适合慢节奏和风景型旅行。',
    source: 'mock',
  },
  {
    id: 'pet-pico',
    name: 'Pico',
    species: '口袋探险家',
    personality: '活泼、行动力强、总能发现奇怪的小路线',
    avatarUrl: '/mock-images/pet-pico.png',
    referenceImageUrl: '/mock-images/pet-pico-reference.jpg',
    description: '适合探索城市角落、异世界入口和随机路线。',
    source: 'mock',
  },
];

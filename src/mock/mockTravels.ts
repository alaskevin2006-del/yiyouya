import { mockDestinations } from './mockDestinations';
import type { TravelRecord } from '../types';

const zhuhaiDestination = mockDestinations.find((destination) => destination.id === 'dest-zhuhai') ?? mockDestinations[0];

export const mockTravels: TravelRecord[] = [
  {
    id: 'travel-demo-001',
    userId: 'user-demo-001',
    petId: 'pet-song-song-duck',
    destination: zhuhaiDestination,
    worldType: 'real',
    status: 'completed',
    travelIndex: 1,
    messages: [
      {
        id: 'msg-demo-001',
        role: 'pet',
        content: '逸仙学子，老师把珠海的一天装进手账里了。上午在中山大学珠海校区看红砖，下午去日月贝吹海风，晚上慢慢走到唐家古镇。',
        createdAt: '2026-05-20T10:00:00.000Z',
      },
    ],
    diaryEntries: [
      {
        id: 'diary-demo-001',
        destinationId: zhuhaiDestination.id,
        title: '逸仙学子的一日珠海手账',
        content: '松松鸭从中山大学珠海校区出发，在日月贝看夕阳落到海面，又把唐家古镇的灯火和茶果香气写进了最后一页。',
        imageUrl: '/mock-images/zhuhai-journal-campus.png',
        createdAt: '2026-05-20T10:10:00.000Z',
      },
    ],
    intimacyDelta: 1,
    createdAt: '2026-05-20T09:50:00.000Z',
    endedAt: '2026-05-20T10:30:00.000Z',
  },
];

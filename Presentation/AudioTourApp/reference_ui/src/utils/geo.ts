import { POI, Tour } from '../types';

// Haversine formula to calculate distance in meters
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // metres
  const φ1 = lat1 * Math.PI/180; // φ, λ in radians
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // in metres
}

// Generate mock POIs around a given location
export function generateMockPOIs(lat: number, lng: number): POI[] {
  // 1 degree latitude is approx 111km. 
  // 10 meters is approx 0.00009 degrees.
  const offset10m = 0.00009;

  return [
    {
      id: 'poi-1',
      name: { en: 'The Ancient Tree', vi: 'Cây Cổ Thụ' },
      description: { 
        en: 'This tree has stood here for over 200 years, witnessing the changing times of the city. Its roots run deep into the history of this land.',
        vi: 'Cây cổ thụ này đã đứng đây hơn 200 năm, chứng kiến bao thăng trầm của thành phố. Rễ của nó ăn sâu vào lịch sử của vùng đất này.'
      },
      lat: lat + offset10m * 2, // 20m North
      lng: lng,
      played: false,
      imageUrl: 'https://picsum.photos/seed/tree/400/300'
    },
    {
      id: 'poi-2',
      name: { en: 'Historical Monument', vi: 'Đài Tưởng Niệm Lịch Sử' },
      description: {
        en: 'A monument dedicated to the founders of the city. Built in the late 19th century, it remains a symbol of resilience.',
        vi: 'Đài tưởng niệm dành riêng cho những người sáng lập thành phố. Được xây dựng vào cuối thế kỷ 19, nó vẫn là một biểu tượng của sự kiên cường.'
      },
      lat: lat,
      lng: lng + offset10m * 3, // 30m East
      played: false,
      imageUrl: 'https://picsum.photos/seed/monument/400/300'
    },
    {
      id: 'poi-3',
      name: { en: 'Hidden Fountain', vi: 'Đài Phun Nước Ẩn' },
      description: {
        en: 'A beautiful hidden fountain that was recently restored. The water flows from a natural spring beneath the city streets.',
        vi: 'Một đài phun nước tuyệt đẹp ẩn mình vừa được phục hồi gần đây. Nước chảy từ một con suối tự nhiên bên dưới những con phố.'
      },
      lat: lat - offset10m * 2,
      lng: lng - offset10m * 2, // ~28m South-West
      played: false,
      imageUrl: 'https://picsum.photos/seed/fountain/400/300'
    },
    {
      id: 'poi-4',
      name: { en: 'Old City Gate', vi: 'Cổng Thành Cũ' },
      description: {
        en: 'The last remaining gate of the ancient citadel. It features intricate stone carvings and a watchtower.',
        vi: 'Cổng thành cuối cùng còn sót lại của hoàng thành cổ. Nó có các hình chạm khắc trên đá tinh xảo và một tháp canh.'
      },
      lat: lat + offset10m * 4,
      lng: lng - offset10m * 1,
      played: false,
      imageUrl: 'https://picsum.photos/seed/gate/400/300'
    }
  ];
}

export function generateMockTours(): Tour[] {
  return [
    {
      id: 'tour-1',
      name: { en: 'Historical Walk', vi: 'Đi Bộ Lịch Sử' },
      description: { 
        en: 'Discover the ancient roots of the city through its oldest landmarks.', 
        vi: 'Khám phá cội nguồn cổ xưa của thành phố qua các địa danh lâu đời nhất.' 
      },
      poiIds: ['poi-1', 'poi-2', 'poi-4'],
      imageUrl: 'https://picsum.photos/seed/history/600/400'
    },
    {
      id: 'tour-2',
      name: { en: 'Hidden Gems', vi: 'Viên Ngọc Ẩn Giấu' },
      description: { 
        en: 'Explore the lesser-known but beautiful spots tucked away in quiet corners.', 
        vi: 'Khám phá những địa điểm ít người biết đến nhưng tuyệt đẹp ẩn mình trong những góc khuất.' 
      },
      poiIds: ['poi-3', 'poi-1'],
      imageUrl: 'https://picsum.photos/seed/hidden/600/400'
    }
  ];
}

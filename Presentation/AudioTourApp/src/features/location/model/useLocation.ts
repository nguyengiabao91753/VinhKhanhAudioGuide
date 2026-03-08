import { useEffect, useState } from 'react';
import type { Location } from '../lib/LocationService';
import { LocationService } from '../lib/LocationService';

export function useLocation() {
  const [location, setLocation] = useState<Location | null>(null);

  useEffect(()=>{
    const svc = LocationService.getInstance();
    svc.start();

    const unsub = svc.subscribe((loc)=> setLocation(loc));
    return ()=>{
      unsub();
    };
  },[]);

  return location;
}

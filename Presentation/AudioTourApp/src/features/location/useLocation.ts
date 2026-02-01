import { useEffect, useState } from 'react';
import type { Location } from './LocationService';
import { LocationService } from './LocationService';

export function useLocation() {
  const [location, setLocation] = useState<Location | null>(null);

  useEffect(()=>{
    const svc = LocationService.getInstance();
    svc.start();

    const unsub = svc.subscribe((loc)=> setLocation(loc));
    return ()=>{
      unsub();
      // optionally stop service if no longer needed
      // svc.stop();
    };
  },[]);

  return location;
}

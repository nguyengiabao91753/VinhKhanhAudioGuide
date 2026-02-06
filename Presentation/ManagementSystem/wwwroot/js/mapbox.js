let map;
let marker;
let circleId = 'poi-range';
let allMarkers = [];
let allCircles = [];

// Hàm cho Form Add/Edit: Init map với marker draggable và circle
// Cập nhật initMap để thêm Geocoder
window.initMap = (divId, token, lat, lng, range, dotNetRef) => {  // Thêm dotNetRef param
    mapboxgl.accessToken = token;
    map = new mapboxgl.Map({
        container: divId,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [lng, lat],
        zoom: 17,
        pitch: 60,
        bearing: -20,
        antialias: true
    });

    map.on('load', () => {
        marker = new mapboxgl.Marker({ draggable: true })
            .setLngLat([lng, lat])
            .addTo(map);
        drawCircle(lat, lng, range);

        // Geocoder
        const geocoder = new MapboxGeocoder({
            accessToken: mapboxgl.accessToken,
            countries: 'vn',
            bbox: [102.144, 8.56, 109.46, 23.39],
            placeholder: 'Tìm địa điểm ở Việt Nam (ví dụ: Bến Thành, TP.HCM)',
            proximity: [106.6297, 10.8231]  // Ưu tiên gần TP.HCM
        });

        map.addControl(geocoder, 'top-left');

        geocoder.on('result', (e) => {
            const place = e.result;
            const coords = place.center;  // [lng, lat]
            marker.setLngLat(coords);
            drawCircle(coords[1], coords[0], range);  // lat, lng
            map.flyTo({ center: coords, zoom: 17 });

            // Gọi instance method qua ref (đúng cách cho Blazor)
            if (dotNetRef) {
                dotNetRef.invokeMethodAsync('SetPoiFromSearch', place.place_name, coords[1], coords[0])
                    .then(() => console.log('Set POI from search success'))
                    .catch(err => console.error('Invoke SetPoiFromSearch error:', err));
            } else {
                console.error('dotNetRef not passed!');
            }
        });

        // Các event khác (dragend, click) cũng cần sửa nếu dùng instance method
        marker.on('dragend', () => {
            const p = marker.getLngLat();
            if (dotNetRef) {
                dotNetRef.invokeMethodAsync('SetLatLng', p.lat, p.lng);
            }
            drawCircle(p.lat, p.lng, range);
        });

        map.on('click', (e) => {
            marker.setLngLat(e.lngLat);
            if (dotNetRef) {
                dotNetRef.invokeMethodAsync('SetLatLng', e.lngLat.lat, e.lngLat.lng);
            }
            drawCircle(e.lngLat.lat, e.lngLat.lng, range);
        });
    });
};

// Update circle khi Range change (gọi từ C#)
window.updateCircle = (range) => {
    if (marker) {
        const p = marker.getLngLat();
        drawCircle(p.lat, p.lng, range);
    }
};

// Hàm draw circle (chung)
function drawCircle(lat, lng, range) {
    const circle = turf.circle([lng, lat], range / 1000, { steps: 64, units: 'kilometers' });  // Range ở mét -> km
    if (map.getSource(circleId)) {
        map.getSource(circleId).setData(circle);
    } else {
        map.addSource(circleId, { type: 'geojson', data: circle });
        map.addLayer({
            id: circleId,
            type: 'fill',
            source: circleId,
            paint: {
                'fill-color': '#0080ff',
                'fill-opacity': 0.25
            }
        });
    }
}

// Hàm cho View All On Map: Init map với all POIs
window.initPoiMap = (poisJson) => {
    const pois = JSON.parse(poisJson);  // Parse từ C# string
    mapboxgl.accessToken = pois[0].token;  // Lấy token từ pois[0] (thêm vào DTO temp)
    map = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [pois[0].Position.Lng, pois[0].Position.Lat],  // Center đầu tiên
        zoom: 10,  // Zoom rộng để view all
        pitch: 45,  // 3D nhẹ
        antialias: true
    });

    map.on('load', () => {
        pois.forEach((poi, index) => {
            const m = new mapboxgl.Marker()
                .setLngLat([poi.Position.Lng, poi.Position.Lat])
                .addTo(map);
            allMarkers.push(m);

            const cId = `poi-circle-${index}`;
            const circle = turf.circle([poi.Position.Lng, poi.Position.Lat], (poi.Range || 0) / 1000, { steps: 64, units: 'kilometers' });
            map.addSource(cId, { type: 'geojson', data: circle });
            map.addLayer({
                id: cId,
                type: 'fill',
                source: cId,
                paint: {
                    'fill-color': '#ff0000',  // Màu khác để highlight all
                    'fill-opacity': 0.3
                }
            });
            allCircles.push(cId);
        });
    });
};

// Focus POI: Fly to, highlight (zoom in, change color temp)
window.focusPoi = (lng, lat, range) => {
    if (map) {
        map.flyTo({
            center: [lng, lat],
            zoom: 17,
            pitch: 60,
            bearing: -20,
            essential: true  // Animation mượt
        });
        // Có thể add temp highlight circle nếu cần phức tạp hơn
    }
};
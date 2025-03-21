let map;
let flightData;
let depMarker, arrMarker, flightPath;

function initMap() {
    map = new google.maps.Map(document.getElementById('map'), {
        center: { lat: 0, lng: 0 },
        zoom: 2,
        mapTypeId: google.maps.MapTypeId.TERRAIN
    });
}

async function searchFlight() {
    try {
        const flightIata = document.getElementById('flightIata').value;
        if (!flightIata) {
            throw new Error('Inserisci un numero di volo');
        }

        const response = await fetch(`http://api.aviationstack.com/v1/flights?access_key=8347481e62e789e5b55a05d779712b8c&flight_iata=${flightIata}`);
        if (!response.ok) {
            throw new Error('Volo non trovato');
        }

        const data = await response.json();
        if (data.data && data.data.length > 0) {
            flightData = data.data[0];
            displayFlightInfo(flightData);
            updateMap(flightData);
            await fetchWeather(flightData);
        } else {
            throw new Error('Nessun dato disponibile per questo volo');
        }
    } catch (error) {
        console.error('Errore:', error);
        alert(error.message);
    }
}

function displayFlightInfo(flight) {
    const flightInfoDiv = document.getElementById('flightInfo');
    flightInfoDiv.innerHTML = `
        <h2>Informazioni Volo</h2>
        <p>Data: ${flight.flight_date}</p>
        <p>Stato: ${flight.flight_status}</p>
        <p>Partenza: ${flight.departure.airport} (${flight.departure.iata})</p>
        <p>Arrivo: ${flight.arrival.airport} (${flight.arrival.iata})</p>
        <p>Compagnia: ${flight.airline.name}</p>
        <p>Arrivo Previsto: ${flight.arrival.scheduled}</p>
        <p>Arrivo Stimato: ${flight.arrival.estimated || 'N/A'}</p>
    `;
}

function updateMap(flight) {
    // Clear existing markers and path
    if (depMarker) depMarker.setMap(null);
    if (arrMarker) arrMarker.setMap(null);
    if (flightPath) flightPath.setMap(null);

    const depPos = {
        lat: parseFloat(flight.departure.latitude),
        lng: parseFloat(flight.departure.longitude)
    };
    
    const arrPos = {
        lat: parseFloat(flight.arrival.latitude),
        lng: parseFloat(flight.arrival.longitude)
    };

    // Create new markers
    depMarker = new google.maps.Marker({
        position: depPos,
        map: map,
        title: flight.departure.airport,
        icon: 'departure-icon.png'
    });

    arrMarker = new google.maps.Marker({
        position: arrPos,
        map: map,
        title: flight.arrival.airport,
        icon: 'arrival-icon.png'
    });

    // Create flight path
    flightPath = new google.maps.Polyline({
        path: [depPos, arrPos],
        geodesic: true,
        strokeColor: '#FF0000',
        strokeOpacity: 1.0,
        strokeWeight: 2,
        map: map
    });

    // Fit map to show both markers
    const bounds = new google.maps.LatLngBounds();
    bounds.extend(depPos);
    bounds.extend(arrPos);
    map.fitBounds(bounds);
}

async function fetchWeather(flight) {
    try {
        const [depWeather, arrWeather] = await Promise.all([
            fetch(`/api/weather/${flight.departure.iata}`),
            fetch(`/api/weather/${flight.arrival.iata}`)
        ]);

        const depData = await depWeather.json();
        const arrData = await arrWeather.json();

        document.getElementById('departureWeather').innerHTML = formatWeather(depData, 'Departure');
        document.getElementById('arrivalWeather').innerHTML = formatWeather(arrData, 'Arrival');
    } catch (error) {
        console.error('Weather fetch error:', error);
    }
}
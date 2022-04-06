import { useEffect, useRef, useState } from 'react';
import './App.css';
import * as tt from '@tomtom-international/web-sdk-maps';
import * as ttapi from '@tomtom-international/web-sdk-services';
import '@tomtom-international/web-sdk-maps/dist/maps.css';

const App = () => {

  // Definer nogle ting der skal bruges til mappet
  const mapElement = useRef()
  const [map, setMap] = useState({})

  const [longitude, setLongitude] = useState(12.6002)
  const [latitude, setLatitude] = useState(55.631)


  const convertToPoints = (lngLat) => {
    return {
      point: {
        latitude: lngLat.lat,
        longitude: lngLat.lng
      }
    }
  }

  const drawRoute = (geoJson, map) => {
    if (map.getLayer('route')) {
      map.removeLayer('route')
      map.removeSource('route')
    }
    map.addLayer({
      id: 'route',
      type: 'line',
      source: {
        type: 'geojson',
        data: geoJson
      },
      paint: {
        'line-color': '#283618',
        'line-width': 6
      }
    })
  }

  const nySkraldHentLokation = (lngLat, map) => {
    const element = document.createElement('div')
    element.className = 'skrald-hent'
    new tt.Marker({
      element: element
    })
    .setLngLat(lngLat)
    .addTo(map)
  }

  // Lav map 
  useEffect(() => {
    const origin = {
      lng: longitude,
      lat: latitude,
    }

    const destinations = []

    let map = tt.map({
      key: "6r7urAO3rpFC6j9sPheFAv0NYswcxfaQ",
      container: mapElement.current,
      center: [longitude, latitude],
      zoom: 14,
      stylesVisibility: {
        trafficIncidents: true,
        trafficFlow: true
      }
    })

    setMap(map)

    const nyPrik = () => {
      
      const popOffset = {
        bottom: [0,-25]
      }
      const popup = new tt.Popup({ offset: popOffset}).setHTML('Du er her')
      
      const element = document.createElement('div')
      element.className = 'prik'
      const prik = new tt.Marker({
        draggable: true,
        element: element,
      })
      .setLngLat([longitude, latitude])
      .addTo(map)

    prik.on('dragend', () => {
      const lngLat = prik.getLngLat()
      setLongitude(lngLat.lng)
      setLatitude(lngLat.lat)
    })

    prik.setPopup(popup).togglePopup()
    }

    nyPrik()

    const sorterDestinationer = (locations) => {
      const pointsForDestinations = locations.map((destination) => {
        return convertToPoints(destination)
      })
      const callParameters = {
        key: "6r7urAO3rpFC6j9sPheFAv0NYswcxfaQ",
        destinations: pointsForDestinations,
        origins: [convertToPoints(origin)],
      }
      return new Promise((resolve, reject) => {
        ttapi.services
          .matrixRouting(callParameters)
          .then((matrixAPIResults) => {
            const results = matrixAPIResults.matrix[0]
            const resultsArray = results.map((result, index) => {
              return {
                location: locations[index],
                drivingtime: result.response.routeSummary.travelTimeInSeconds,
              }
            })
            resultsArray.sort((a,b) => {
              return a.drivingtime - b.drivingtime
            })
            const sortedLokationer = resultsArray.map((result) => {
              return result.location
            })
            resolve(sortedLokationer)
          })
      })
    }

    const recalculateRuter = () => {
      sorterDestinationer(destinations).then((sorted) => {
        sorted.unshift(origin)

        ttapi.services
          .calculateRoute({
            key: "6r7urAO3rpFC6j9sPheFAv0NYswcxfaQ",
            locations: sorted,
          })
        .then((routeData) => {
          const geoJson = routeData.toGeoJson()
          drawRoute(geoJson, map)
        })
      })
    }

    map.on('click', (e) => {
      destinations.push(e.lngLat)
      nySkraldHentLokation(e.lngLat, map)
      recalculateRuter()
    })

  }, [])
  return (
    <div className="App">
      <div ref={mapElement} className="map">
        <h1>Smart Skraldebil Ruteplan</h1>
      </div>
    </div>
  )
}

export default App;
// sidst video rute kom ik frem
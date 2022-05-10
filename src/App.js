import { useEffect, useRef, useState } from 'react';
import './App.css';
import * as tt from '@tomtom-international/web-sdk-maps';
import * as ttapi from '@tomtom-international/web-sdk-services';
import '@tomtom-international/web-sdk-maps/dist/maps.css';

const App = () => {

  // Definer nogle ting der skal bruges til mappet
  const mapElement = useRef() // som kaldes længere nede i return statement
  const [map, setMap] = useState({}) // så vi har et map, men kan også sætte mappet til et nyt 

  const [longitude, setLongitude] = useState(12.6002) // hvor vi er longitude
  const [latitude, setLatitude] = useState(55.631) // hvor vi er latitude


  // lav vores positioner om til typen lng lat så vi kan bruge dem som geodata når ruten dannes
  const convertToPoints = (lngLat) => {
    return {
      point: {
        latitude: lngLat.lat, // tager lat på tidspunktet og konvertere til data der kan bruges i mappet
        longitude: lngLat.lng // samme med lng
      }
    }
  }

  // tegn ruten på mappet
  const drawRoute = (geoJson, map) => {
    if (map.getLayer('route')) { // hvis der allerde er en rute 
      map.removeLayer('route') // fjern gamle rute
      map.removeSource('route')
    }
    map.addLayer({ // lav en ny rute
      id: 'route',
      type: 'line',
      source: {
        type: 'geojson',
        data: geoJson
      },
      paint: { // lav rutens farve så vi kan se den
        'line-color': '#283618',
        'line-width': 6
      }
    })
  }

  // lav en ny hente lokation
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
  // Vi bruger tomtom api til at lave et map med deres gps data
  useEffect(() => {
    // her er vi:
    const origin = {
      lng: longitude, 
      lat: latitude,
    }

    // et array over destinationer på mappet, starter self. med ingen
    const destinations = []

    // laver et map med tomtom api
    let map = tt.map({
      key: "6r7urAO3rpFC6j9sPheFAv0NYswcxfaQ",
      container: mapElement.current,
      center: [longitude, latitude],
      zoom: 14,
      stylesVisibility: { // Gør vi så vi kan se trafik ulykker og generalt trafik på mappet
        trafficIncidents: true,
        trafficFlow: true
      }
    })

    setMap(map) // sætter mappet til vores map


    // vis hvor skraldemanden er
    const nyPrik = () => {
      // først viser vi hvor skraldemanden er
      const popOffset = {
        bottom: [0,-25]
      } // laver en popup der siger hvor man er
      const popup = new tt.Popup({ offset: popOffset}).setHTML('Du er her')
      
      const element = document.createElement('div')
      element.className = 'prik' // laver en prik som bliver til en skraldbil
      const prik = new tt.Marker({ // bruger tomtomapi til at laver et marker
        draggable: true, // gør så skraldebilen kan ændre lokation
        element: element,
      })
      .setLngLat([longitude, latitude]) // sætter skraldebilens position
      .addTo(map) // tilføjer den til mappet

    prik.on('dragend', () => { // når man trækker i skraldebilen:
      const lngLat = prik.getLngLat() // find ny lokation
      setLongitude(lngLat.lng) 
      setLatitude(lngLat.lat) // sæt skraldebilens ny lokation
    })

    prik.setPopup(popup).togglePopup() // lav popuppet
    }

    nyPrik() // toggle funktionen


    // Sorter lokationer funktion
    const sorterDestinationer = (locations) => {
      // lav adresser om til points af typen lng lat, som ses i funktionen : convertToPoints
      const pointsForDestinations = locations.map((destination) => { // for hver adresse
        return convertToPoints(destination) // lav adresse til convertToPoints (altså lng lat type)
      })

      // call stuff
      const callParameters = {
        key: "6r7urAO3rpFC6j9sPheFAv0NYswcxfaQ", // vi bruger api nølgen til at få adgang til apien
        destinations: pointsForDestinations, // vi har vores destinationer, som vi lige har lavet om til den rigtige type
        origins: [convertToPoints(origin)], // og vi har vores start lokation
      }

      // Så kan vi sortere destinationerne
      return new Promise((resolve, reject) => {
        ttapi.services // ved brug af api fra tomtom
          .matrixRouting(callParameters) // Vi bruger matrixrouting, som modtager adresserne
          .then((matrixAPIResults) => {
            const results = matrixAPIResults.matrix[0] // vi tager resultatet af vores matrixrouting
            const resultsArray = results.map((result, index) => { // for hver resultat skal vi:
              return {
                location: locations[index], // lokationen
                drivingtime: result.response.routeSummary.travelTimeInSeconds, // tid til at nå til lokationen
              }
            })

            // Så sortere vi dem efter hvor længe det tager at køre.
            resultsArray.sort((a,b) => {
              return a.drivingtime - b.drivingtime
            })
            // Så til sidst returnere vi resultat og lokationen af resultatet
            const sortedLokationer = resultsArray.map((result) => { // for hver resultat
              return result.location
            })
            resolve(sortedLokationer)
          })
      })
    }

    // Når flere adresser bliver tilføjet, beregner vi ruten om igen.
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

    // Når man trykker på mappet, og tilføjer en ny destination:
    map.on('click', (e) => {
      destinations.push(e.lngLat) // tilføj destination
      nySkraldHentLokation(e.lngLat, map)
      recalculateRuter() // beregn ruterne igen, med den nye destination
    })

  }, [])
  return ( // Retuner et div, med refferance til mappet, og ellers bare teksten der står
    <div className="App">
      <div ref={mapElement} className="map">
        <h1>Smart Skraldebil Ruteplan</h1>
      </div>
    </div>
  )
}

export default App;

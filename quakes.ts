/**
 * Created by igor on 1/27/16.
 */
/// <reference path="./typings/tsd.d.ts" />
const QUAKE_URL = `http://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson`;
let map = L.map('map').setView([33.858631, -118.279602], 7);
L.tileLayer(`http://{s}.tile.osm.org/{z}/{x}/{y}.png`).addTo(map);

let quakesPathArr = [];
let popup = <HTMLDivElement>document.querySelector('#info-popup');
let pointObservable;
let quakes = Rx.Observable
    .timer(0, 5000)
    .flatMap(()=> {
        return Rx.Observable.create(function (observer) {
            let req = new XMLHttpRequest();
            req.open('GET', QUAKE_URL);
            req.onload = ()=> {
                if (req.status === 200) {
                    observer.onNext(req.response);
                    observer.onCompleted()
                } else {
                    observer.onError(req.statusText);
                }
            };
            req.onerror = ()=> {
                observer.onError(req.statusText)
            };
            req.send();
        })
    })
    .flatMap((res:any):any => {
        return Rx.Observable.from(JSON.parse(res).features)
    })
    .map((quake:any)=> {
        let [x,y] = quake.geometry.coordinates;
        let size = quake.properties.mag * 10000;
        return {
            type: quake.properties.type,
            place: quake.properties.place,
            code: quake.properties.code,
            point: L.circle([y, x], size)
        }
    })
    .distinct((quake:any):any=> {
        return quake.code
    });


quakes.subscribe((quake:any):void=> {
    quakesPathArr.push({code: quake.code, place: quake.place, type: quake.type, point: quake.point.addTo(map)._path});
    pointObservable = Rx.Observable.from(quakesPathArr)
});

let mouseEv = Rx.Observable
    .fromEvent(document, 'mousemove');

let hover = mouseEv
    .filter((e:any)=> {
        return e.target.tagName === 'path'
    })
    .flatMap((ev:any)=> {
        return pointObservable.filter((quake:any)=> {
            return quake.point === ev.target;
        }).map((e:any)=> {
            return {place: e.place, x: ev.pageX, y: ev.pageY}
        })
    });
let unhover = mouseEv
    .distinctUntilChanged((e:any)=> {
        return e.target;
    })
    .filter((e:any)=> {
        return e.target.tagName !== 'path'
    });

unhover.subscribe((e:any)=> {
    popup.style.display = 'none';
});
hover.subscribe((e:any)=> {
    popup.style.top = `${e.y + 20}px`;
    popup.style.left = `${e.x + 20}px`;
    popup.style.display = 'block';
    popup.innerHTML = e.place;
});

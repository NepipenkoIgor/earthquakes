/**
 * Created by igor on 1/27/16.
 */
/// <reference path="./typings/tsd.d.ts" />
var QUAKE_URL = "http://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson";
var map = L.map('map').setView([33.858631, -118.279602], 7);
L.tileLayer("http://{s}.tile.osm.org/{z}/{x}/{y}.png").addTo(map);
var quakesPathArr = [];
var popup = document.querySelector('#info-popup');
var pointObservable;
var quakes = Rx.Observable
    .timer(0, 5000)
    .flatMap(function () {
    return Rx.Observable.create(function (observer) {
        var req = new XMLHttpRequest();
        req.open('GET', QUAKE_URL);
        req.onload = function () {
            if (req.status === 200) {
                observer.onNext(req.response);
                observer.onCompleted();
            }
            else {
                observer.onError(req.statusText);
            }
        };
        req.onerror = function () {
            observer.onError(req.statusText);
        };
        req.send();
    });
})
    .flatMap(function (res) {
    return Rx.Observable.from(JSON.parse(res).features);
})
    .map(function (quake) {
    var _a = quake.geometry.coordinates, x = _a[0], y = _a[1];
    var size = quake.properties.mag * 10000;
    return {
        type: quake.properties.type,
        place: quake.properties.place,
        code: quake.properties.code,
        point: L.circle([y, x], size)
    };
})
    .distinct(function (quake) {
    return quake.code;
});
quakes.subscribe(function (quake) {
    quakesPathArr.push({ code: quake.code, place: quake.place, type: quake.type, point: quake.point.addTo(map)._path });
    pointObservable = Rx.Observable.from(quakesPathArr);
});
var mouseEv = Rx.Observable
    .fromEvent(document, 'mousemove');
var hover = mouseEv
    .filter(function (e) {
    return e.target.tagName === 'path';
})
    .flatMap(function (ev) {
    return pointObservable.filter(function (quake) {
        return quake.point === ev.target;
    }).map(function (e) {
        return { place: e.place, x: ev.pageX, y: ev.pageY };
    });
});
var unhover = mouseEv
    .distinctUntilChanged(function (e) {
    return e.target;
})
    .filter(function (e) {
    return e.target.tagName !== 'path';
});
unhover.subscribe(function (e) {
    popup.style.display = 'none';
});
hover.subscribe(function (e) {
    popup.style.top = (e.y + 20) + "px";
    popup.style.left = (e.x + 20) + "px";
    popup.style.display = 'block';
    popup.innerHTML = e.place;
});

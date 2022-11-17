/* global maplibregl:false, Maps: false, IntensityToClassString: false, Maps.report: true, IntensityI: false, changeView: false, replay: true, replayT: true */

TREM.Intensity = {
	isTriggered : false,
	alertTime   : 0,
	intensities : new Map(),
	geojson     : null,

	/**
	 * @type {maplibregl.Marker[]}
	 */
	_markers      : [],
	_markersGroup : null,
	handle(rawIntensityData) {
		if (rawIntensityData.TimeStamp != this.alertTime) {
			const raw = rawIntensityData.raw;
			rawIntensityData = raw.intensity;
			this.alertTime = rawIntensityData.TimeStamp;
			const PLoc = {};
			const int = new Map();

			for (let index = 0, keys = Object.keys(rawIntensityData), n = keys.length; index < n; index++) {
				const towncode = keys[index] + "0";
				const intensity = rawIntensityData[keys[index]];

				if (!towncode) continue;

				if (intensity == 0) continue;
				int.set(towncode, intensity);
				PLoc[towncode] = intensity;
			}

			if (TREM.Detector.webgl) {
				if (this.intensities.size)
					for (let index = 0, keys = Object.keys(rawIntensityData), n = keys.length; index < n; index++) {
						const towncode = keys[index] + "0";
						const intensity = rawIntensityData[keys[index]];

						if (int.get(towncode) != intensity) {
							this.intensities.delete(towncode);
							Maps.intensity.setFeatureState({
								source : "Source_tw_town",
								id     : towncode,
							}, { intensity: 0 });
						}
					}

				if (int.size) {
					dump({ level: 0, message: `Total ${int.size} triggered area`, origin: "Intensity" });

					for (const [towncode, intensity] of int)
						if (this.intensities.get(towncode) != intensity)
							Maps.intensity.setFeatureState({
								source : "Source_tw_town",
								id     : towncode,
							}, { intensity });

					Maps.intensity.setLayoutProperty("Layer_intensity", "visibility", "visible");

					this.intensities = int;

					document.getElementById("intensity-overview").style.visibility = "visible";
					document.getElementById("intensity-overview").classList.add("show");
					const time = new Date(`${raw.originTime}`);
					document.getElementById("intensity-overview-time").innerText = time.toLocaleString(undefined, { dateStyle: "long", timeStyle: "medium", hour12: false, timeZone: "Asia/Taipei" });
					document.getElementById("intensity-overview-latitude").innerText = raw.epicenter.epicenterLat.$t;
					document.getElementById("intensity-overview-longitude").innerText = raw.epicenter.epicenterLon.$t;
					document.getElementById("intensity-overview-magnitude").innerText = raw.magnitude.magnitudeValue;
					document.getElementById("intensity-overview-depth").innerText = raw.depth.$t;

					this._markers.push(
						new maplibregl.Marker({
							element: $(TREM.Resources.icon.cross(
								{ size: 32, className: "epicenterIcon", zIndexOffset: 5000 },
							))[0],
						}).setLngLat([raw.epicenter.epicenterLon.$t, raw.epicenter.epicenterLat.$t]).addTo(Maps.intensity),
					);


					if (!this.isTriggered) {
						this.isTriggered = true;
						changeView("intensity", "#mainView_btn");

						if (setting["Real-time.show"]) TREM.win.showInactive();

						if (setting["Real-time.cover"]) TREM.win.moveTop();

						if (!TREM.win.isFocused()) TREM.win.flashFrame(true);

						if (setting["audio.realtime"]) TREM.Audios.palert.play();
						TREM.IntensityTag1 = NOW.getTime();
						console.log("IntensityTag1: ", TREM.IntensityTag1);
					}
				}
			} else {
				if (this.geojson == null) {
					this.isTriggered = true;
					changeView("intensity", "#mainView_btn");

					if (setting["Real-time.show"]) TREM.win.showInactive();

					if (setting["Real-time.cover"]) TREM.win.moveTop();

					if (!TREM.win.isFocused()) TREM.win.flashFrame(true);

					if (setting["audio.realtime"]) TREM.Audios.palert.play();
					TREM.IntensityTag1 = NOW.getTime();
					console.log("IntensityTag1: ", TREM.IntensityTag1);
				} else {
					this.geojson.remove();
				}

				document.getElementById("intensity-overview").style.visibility = "visible";
				document.getElementById("intensity-overview").classList.add("show");
				const time = new Date(`${raw.originTime}`);
				document.getElementById("intensity-overview-time").innerText = time.toLocaleString(undefined, { dateStyle: "long", timeStyle: "medium", hour12: false, timeZone: "Asia/Taipei" });
				document.getElementById("intensity-overview-latitude").innerText = raw.epicenter.epicenterLat.$t;
				document.getElementById("intensity-overview-longitude").innerText = raw.epicenter.epicenterLon.$t;
				document.getElementById("intensity-overview-magnitude").innerText = raw.magnitude.magnitudeValue;
				document.getElementById("intensity-overview-depth").innerText = raw.depth.$t;

				this._markers.push(L.marker(
					[raw.epicenter.epicenterLat.$t, raw.epicenter.epicenterLon.$t],
					{
						icon: L.divIcon({
							html      : TREM.Resources.icon.oldcross,
							iconSize  : [32, 32],
							className : "epicenterIcon",
						}),
						zIndexOffset: 5000,
					}));
				this._markersGroup = L.featureGroup(this._markers).addTo(Maps.intensity);

				this.geojson = L.geoJson.vt(TREM.MapData.tw_town, {
					minZoom   : 4,
					maxZoom   : 15,
					tolerance : 20,
					buffer    : 256,
					debug     : 0,
					zIndex    : 5,
					style     : (properties) => {
						const name = properties.TOWNCODE;

						if (PLoc[name] == 0 || PLoc[name] == undefined)
							return {
								color       : "transparent",
								weight      : 0,
								opacity     : 0,
								fillColor   : "transparent",
								fillOpacity : 0,
							};
						return {
							color       : TREM.Colors.secondary,
							weight      : 0.8,
							fillColor   : TREM.color(PLoc[name]),
							fillOpacity : 1,
						};
					},
				}).addTo(Maps.intensity);
			}

			if (this.timer)
				this.timer.refresh();
			else
				this.timer = setTimeout(() => this.clear, 60_000);

		}

	},
	clear() {
		dump({ level: 0, message: "Clearing Intensity map", origin: "Intensity" });

		if (this.intensities.size) {
			Maps.intensity.removeFeatureState({ source: "Source_tw_town" });
			Maps.intensity.setLayoutProperty("Layer_intensity", "visibility", "none");
			document.getElementById("intensity-overview").style.visibility = "none";
			document.getElementById("intensity-overview").classList.remove("show");
			delete this.intensities;
			this._markers = [];
			this.intensities = new Map();
			this.alertTime = 0;
			this.isTriggered = false;

			if (this.timer) {
				clearTimeout(this.timer);
				delete this.timer;
			}
		}
	},
};
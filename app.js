/**
 * Grodno WWII Search Expedition Web-GIS Controller
 * Main Application Logic
 */

document.addEventListener("DOMContentLoaded", function() {
  // Global State
  const state = {
    data: window.GRODNO_GIS_DATA || { points: [], chronology: [], mapLayers: [], archivalSources: [], memoirsAndEvidence: [], photoArchive: [] },
    userPoints: JSON.parse(localStorage.getItem("grodno_user_points") || "[]"),
    activePeriod: "all",
    activeCategory: "all",
    searchQuery: "",
    selectedPointId: null,
    isSplitScreen: false,
    splitRatio: 0.5,
    measureActive: false,
    measurePoints: [],
    measurePolyline: null,
    userLocationMarker: null,
    coordsFormat: "DD", // "DD" or "DMS"
    isPickingCoords: false,
    pickCoordsCallback: null,
    archiveSearchQuery: "",
    archivePeriod: "all",
    activeArchiveId: null,
    gps: {
      watchId: null,
      isLiveTracking: false,
      followUser: true,
      userLatLng: null,
      accuracy: null,
      heading: null,
      accuracyCircle: null,
      navTarget: null,
      navPolyline: null,
      isRecordingTrack: false,
      recordedTrackPoints: [],
      recordedTrackPolyline: null
    }
  };

  // DOM Elements
  const el = {
    map: document.getElementById("map"),
    mapSplit: document.getElementById("mapSplit"),
    splitDivider: document.getElementById("splitDivider"),
    splitBadgeLeft: document.getElementById("splitBadgeLeft"),
    splitBadgeRight: document.getElementById("splitBadgeRight"),
    sidebar: document.getElementById("sidebar"),
    btnToggleSidebar: document.getElementById("btnToggleSidebar"),
    btnSplitScreen: document.getElementById("btnSplitScreen"),
    btnAddPoint: document.getElementById("btnAddPoint"),
    btnExport: document.getElementById("btnExport"),
    btnMeasure: document.getElementById("btnMeasure"),
    btnHelp: document.getElementById("btnHelp"),
    btnLocateMe: document.getElementById("btnLocateMe"),
    btnLiveGpsToggle: document.getElementById("btnLiveGpsToggle"),
    btnGpsTrackRecorder: document.getElementById("btnGpsTrackRecorder"),
    searchInput: document.getElementById("searchInput"),
    btnClearSearch: document.getElementById("btnClearSearch"),
    categoryFilter: document.getElementById("categoryFilter"),
    periodFilter: document.getElementById("periodFilter"),
    filteredPointsCount: document.getElementById("filteredPointsCount"),
    totalPointsCount: document.getElementById("totalPointsCount"),
    btnResetFilters: document.getElementById("btnResetFilters"),
    pointsList: document.getElementById("pointsList"),
    chronologyList: document.getElementById("chronologyList"),
    sourcesList: document.getElementById("sourcesList"),
    archiveSearchInput: document.getElementById("archiveSearchInput"),
    btnClearArchiveSearch: document.getElementById("btnClearArchiveSearch"),
    archivePeriodFilter: document.getElementById("archivePeriodFilter"),
    memoirsList: document.getElementById("memoirsList"),
    photoList: document.getElementById("photoList"),
    statMemorialsCount: document.getElementById("statMemorialsCount"),
    statProspectiveCount: document.getElementById("statProspectiveCount"),
    statUserCount: document.getElementById("statUserCount"),
    pointsTabCount: document.getElementById("pointsTabCount"),
    hudCoords: document.getElementById("hudCoords"),
    measureToolbar: document.getElementById("measureToolbar"),
    measureResult: document.getElementById("measureResult"),
    btnClearMeasure: document.getElementById("btnClearMeasure"),
    btnCloseMeasure: document.getElementById("btnCloseMeasure"),
    offlineIndicator: document.getElementById("offlineIndicator"),
    toastContainer: document.getElementById("toastContainer"),
    printSection: document.getElementById("printSection"),
    
    // GPS Navigation HUD Elements
    gpsNavHud: document.getElementById("gpsNavHud"),
    gpsNavTargetName: document.getElementById("gpsNavTargetName"),
    btnStopGpsNav: document.getElementById("btnStopGpsNav"),
    compassNeedle: document.getElementById("compassNeedle"),
    gpsDistanceVal: document.getElementById("gpsDistanceVal"),
    gpsBearingVal: document.getElementById("gpsBearingVal"),
    gpsAccuracyVal: document.getElementById("gpsAccuracyVal"),
    btnCenterUserGps: document.getElementById("btnCenterUserGps"),
    btnCenterTargetGps: document.getElementById("btnCenterTargetGps"),
    btnToggleFollowMode: document.getElementById("btnToggleFollowMode"),
    followModeLabel: document.getElementById("followModeLabel"),
    
    // GPS Track Recorder HUD Elements
    trackRecorderHud: document.getElementById("trackRecorderHud"),
    btnCloseTrackRecorder: document.getElementById("btnCloseTrackRecorder"),
    trackLengthVal: document.getElementById("trackLengthVal"),
    trackPointsCountVal: document.getElementById("trackPointsCountVal"),
    btnToggleRecordTrack: document.getElementById("btnToggleRecordTrack"),
    recordTrackBtnLabel: document.getElementById("recordTrackBtnLabel"),
    btnExportRecordedTrack: document.getElementById("btnExportRecordedTrack"),
    btnClearRecordedTrack: document.getElementById("btnClearRecordedTrack"),
    
    // Mobile Bottom Navigation Dock Elements
    btnSidebarCloseMobile: document.getElementById("btnSidebarCloseMobile"),
    mobileBottomDock: document.getElementById("mobileBottomDock"),
    dockBtnMap: document.getElementById("dockBtnMap"),
    dockBtnPoints: document.getElementById("dockBtnPoints"),
    dockBtnLayers: document.getElementById("dockBtnLayers"),
    dockBtnSplit: document.getElementById("dockBtnSplit"),
    dockBtnGPS: document.getElementById("dockBtnGPS"),
    dockPointsBadge: document.getElementById("dockPointsBadge"),
    
    // Modals
    dossierModal: document.getElementById("dossierModal"),
    pointModal: document.getElementById("pointModal"),
    exportModal: document.getElementById("exportModal"),
    helpModal: document.getElementById("helpModal"),
    pointForm: document.getElementById("pointForm"),
    
    // Point Modal Helpers
    btnPickMapCoords: document.getElementById("btnPickMapCoords"),
    btnFillMapCenter: document.getElementById("btnFillMapCenter"),
    btnFillGPS: document.getElementById("btnFillGPS"),
    
    // Dossier Elements
    dossierTitle: document.getElementById("dossierTitle"),
    dossierCodeBadge: document.getElementById("dossierCodeBadge"),
    dossierCategory: document.getElementById("dossierCategory"),
    dossierPeriod: document.getElementById("dossierPeriod"),
    dossierUnit: document.getElementById("dossierUnit"),
    dossierCoords: document.getElementById("dossierCoords"),
    dossierDepth: document.getElementById("dossierDepth"),
    dossierCasualties: document.getElementById("dossierCasualties"),
    dossierDescription: document.getElementById("dossierDescription"),
    dossierArchiveRef: document.getElementById("dossierArchiveRef"),
    dossierRecommendation: document.getElementById("dossierRecommendation"),
    btnToggleCoordsFormat: document.getElementById("btnToggleCoordsFormat"),
    coordsFormatLabel: document.getElementById("coordsFormatLabel"),
    btnCopyCoords: document.getElementById("btnCopyCoords"),
    btnDossierPrint: document.getElementById("btnDossierPrint"),
    btnDossierExportGPX: document.getElementById("btnDossierExportGPX"),
    btnDossierFocusMap: document.getElementById("btnDossierFocusMap"),
    btnDossierNavigateGPS: document.getElementById("btnDossierNavigateGPS"),
    linkNavYandex: document.getElementById("linkNavYandex"),
    linkNavGoogle: document.getElementById("linkNavGoogle"),
    linkNavOSM: document.getElementById("linkNavOSM"),
    linkDossierPamyat: document.getElementById("linkDossierPamyat"),
    linkDossierOBD: document.getElementById("linkDossierOBD"),
    
    // Archive Document Reader Modal Elements
    archiveDocModal: document.getElementById("archiveDocModal"),
    docArchiveBadge: document.getElementById("docArchiveBadge"),
    docTitle: document.getElementById("docTitle"),
    docArchiveCode: document.getElementById("docArchiveCode"),
    docDate: document.getElementById("docDate"),
    docAuthor: document.getElementById("docAuthor"),
    docSector: document.getElementById("docSector"),
    docFullText: document.getElementById("docFullText"),
    btnDocShowOnMap: document.getElementById("btnDocShowOnMap"),
    btnDocCopyCitation: document.getElementById("btnDocCopyCitation"),
    linkDocExternal: document.getElementById("linkDocExternal"),
    
    // Export Elements
    btnExportGPXAll: document.getElementById("btnExportGPXAll"),
    btnExportGPXProspective: document.getElementById("btnExportGPXProspective"),
    btnExportKMLAll: document.getElementById("btnExportKMLAll"),
    btnExportGeoJSON: document.getElementById("btnExportGeoJSON"),
    btnPrintFieldSheet: document.getElementById("btnPrintFieldSheet"),
    
    // Layer Controls
    baseMapOptions: document.getElementById("baseMapOptions"),
    overlayLayersOptions: document.getElementById("overlayLayersOptions"),
    chkFrontlines1941: document.getElementById("chkFrontlines1941"),
    chkFrontlines1944: document.getElementById("chkFrontlines1944")
  };

  // Map & Layer Variables
  let mainMap, splitMap;
  let mainTileLayers = {}, splitTileLayers = {};
  let overlayLayersMain = {}, overlayLayersSplit = {};
  let vectorLayer1941Main, vectorLayer1944Main, vectorLayer1941Split, vectorLayer1944Split;
  let markersGroupMain, markersGroupSplit;
  let currentDossierPoint = null;

  // Initialize App
  init();

  function init() {
    initServiceWorker();
    initMaps();
    initLayersManager();
    initMarkers();
    initVectorLayers();
    initUIEvents();
    initMobileDock();
    initDeviceOrientation();
    renderPointsList();
    renderChronology();
    renderArchivalSources();
    renderMemoirsAndPhotos();
    updateMetrics();
  }

  /* ==========================================================================
     Service Worker & Offline Notification System
     ========================================================================== */
  function initServiceWorker() {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("./sw.js")
        .then(reg => {
          console.log("[PWA] Service Worker registered with scope:", reg.scope);
        })
        .catch(err => {
          console.warn("[PWA] Service Worker registration failed:", err);
        });
    }

    const updateOnlineStatus = () => {
      if (el.offlineIndicator) {
        el.offlineIndicator.style.display = navigator.onLine ? "none" : "flex";
      }
    };

    window.addEventListener("online", () => {
      updateOnlineStatus();
      showToast("Подключение к сети восстановлено", "success");
    });

    window.addEventListener("offline", () => {
      updateOnlineStatus();
      showToast("Переход в автономный офлайн-режим карты", "warning");
    });

    updateOnlineStatus();
  }

  /* ==========================================================================
     Tactical Toast Notification Engine
     ========================================================================== */
  function showToast(message, type = "info", duration = 3200) {
    if (!el.toastContainer) return;
    const iconMap = {
      success: "fa-circle-check",
      info: "fa-circle-info",
      warning: "fa-triangle-exclamation",
      error: "fa-circle-xmark"
    };

    const toast = document.createElement("div");
    toast.className = `tactical-toast toast-${type}`;
    toast.innerHTML = `<i class="fa-solid ${iconMap[type] || "fa-info"}"></i> <span>${message}</span>`;
    el.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateY(15px)";
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  /* ==========================================================================
     Map Initialization & Synchronized Split-Screen Viewport
     ========================================================================== */
  function initMaps() {
    const center = [53.75, 23.75];
    const zoom = 11;

    // Primary Map
    mainMap = L.map("map", {
      center: center,
      zoom: zoom,
      zoomControl: false
    });
    L.control.zoom({ position: "topright" }).addTo(mainMap);

    // Secondary Map (For Split-Screen View)
    splitMap = L.map("mapSplit", {
      center: center,
      zoom: zoom,
      zoomControl: false,
      attributionControl: false,
      boxZoom: false,
      doubleClickZoom: false,
      dragging: false,
      keyboard: false,
      scrollWheelZoom: false,
      touchZoom: false
    });

    const syncViewports = function() {
      if (splitMap && mainMap) {
        splitMap.setView(mainMap.getCenter(), mainMap.getZoom(), { animate: false });
      }
    };

    mainMap.on("movestart move moveend zoom zoomend viewreset", syncViewports);

    mainMap.on("mousemove", function(e) {
      el.hudCoords.innerHTML = `<i class="fa-solid fa-location-crosshairs"></i> WGS84: ${e.latlng.lat.toFixed(5)}° N, ${e.latlng.lng.toFixed(5)}° E`;
    });

    mainMap.on("contextmenu", function(e) {
      openAddPointModal(e.latlng.lat.toFixed(6), e.latlng.lng.toFixed(6));
    });

    mainMap.on("click", function(e) {
      if (state.isPickingCoords) {
        state.isPickingCoords = false;
        el.map.classList.remove("map-measuring");
        if (state.pickCoordsCallback) {
          state.pickCoordsCallback(e.latlng);
        }
        return;
      }
      if (state.measureActive) {
        addMeasurePoint(e.latlng);
      }
    });

    markersGroupMain = L.layerGroup().addTo(mainMap);
    markersGroupSplit = L.layerGroup().addTo(splitMap);
  }

  /* ==========================================================================
     Cartographic Layer Manager
     ========================================================================== */
  function initLayersManager() {
    const layers = state.data.mapLayers || [];

    // Base Maps Setup
    const baseLayers = layers.filter(l => l.isBase);
    baseLayers.forEach((l, index) => {
      let mainLayer = L.tileLayer(l.url, { attribution: l.attribution, maxZoom: l.maxZoom || 19, zIndex: 1 });
      let splitLayer = L.tileLayer(l.url, { maxZoom: l.maxZoom || 19, zIndex: 1 });

      mainTileLayers[l.id] = mainLayer;
      splitTileLayers[l.id] = splitLayer;

      if (index === 0) {
        mainLayer.addTo(mainMap);
      }
      if (index === 1 || l.id === "dark_matter") {
        splitLayer.addTo(splitMap);
      }

      const radioHtml = `
        <div class="layer-radio-item">
          <label class="layer-item-header">
            <input type="radio" name="baseMapRadio" value="${l.id}" ${index === 0 ? "checked" : ""}>
            <span>${l.name}</span>
          </label>
        </div>
      `;
      el.baseMapOptions.insertAdjacentHTML("beforeend", radioHtml);
    });

    // Base layer selector handler - REMOVES PREVIOUS BASE LAYERS & ADDS SELECTED
    el.baseMapOptions.addEventListener("change", function(e) {
      if (e.target.name === "baseMapRadio") {
        const selectedId = e.target.value;

        Object.keys(mainTileLayers).forEach(id => {
          if (mainMap.hasLayer(mainTileLayers[id])) {
            mainMap.removeLayer(mainTileLayers[id]);
          }
        });

        if (mainTileLayers[selectedId]) {
          mainTileLayers[selectedId].addTo(mainMap);
        }

        Object.keys(splitTileLayers).forEach(id => {
          if (splitMap.hasLayer(splitTileLayers[id])) {
            splitMap.removeLayer(splitTileLayers[id]);
          }
        });

        const splitAltId = selectedId === "satellite" ? "voyager" : selectedId;
        if (splitTileLayers[splitAltId]) {
          splitTileLayers[splitAltId].addTo(splitMap);
        }
      }
    });

    // NARA Aerial Reconnaissance Flight Sectors
    const NARA_AERIAL_SECTORS = [
      {
        id: "GX-12450-SD",
        name: "Полетная полоса NARA GX 12450-SD (23.06.1941)",
        bounds: [[53.7747, 23.5437], [53.8849, 23.6865]],
        desc: "Аэрофоторазведка Люфтваффе: Сопоцкин — Новики — ДОТ № 86 — 86 ПО НКВД"
      },
      {
        id: "GX-2831-SD",
        name: "Полетная полоса NARA GX 2831-SD (1941 г.)",
        bounds: [[53.8169, 23.6481], [53.9205, 23.7854]],
        desc: "Аэрофоторазведка рубежей Августовского канала, шлюза Немново и Домбровка"
      },
      {
        id: "GX-4145-SD",
        name: "Полетная полоса NARA GX 4145-SD (Июль 1944 г.)",
        bounds: [[53.6446, 23.7305], [53.7617, 23.8843]],
        desc: "Аэрофоторазведка переправ р. Неман, урочища Пышки и Солы (31-я армия, 2-й гв. кк)"
      }
    ];

    let naraFootprintsMain = L.featureGroup();
    let naraFootprintsSplit = L.featureGroup();

    NARA_AERIAL_SECTORS.forEach(sec => {
      const rectMain = L.rectangle(sec.bounds, {
        color: "#00e5ff",
        weight: 1.5,
        dashArray: "6, 6",
        fillColor: "#00e5ff",
        fillOpacity: 0.08
      }).bindTooltip(`<div class="nara-footprint-label"><i class="fa-solid fa-camera"></i> ${sec.name}</div>`, {
        permanent: false,
        direction: "center"
      }).bindPopup(`
        <div style="font-size:12px; line-height:1.4;">
          <strong style="color:var(--color-accent-amber); font-size:13px;"><i class="fa-solid fa-camera-retro"></i> ${sec.name}</strong><br>
          <p style="margin:4px 0; color:#ddd;">${sec.desc}</p>
          <div style="font-size:11px; color:#888; margin-top:4px;">Фонд NARA RG-373 (Airborne Reconnaissance)</div>
        </div>
      `);
      naraFootprintsMain.addLayer(rectMain);

      const rectSplit = L.rectangle(sec.bounds, {
        color: "#00e5ff",
        weight: 1.5,
        dashArray: "6, 6",
        fillColor: "#00e5ff",
        fillOpacity: 0.08
      });
      naraFootprintsSplit.addLayer(rectSplit);
    });

    // Historical Overlay Layers Setup
    const overlays = layers.filter(l => l.isOverlay);
    overlays.forEach(l => {
      let overlayMain = L.tileLayer(l.url, {
        attribution: l.attribution,
        opacity: l.opacity || 0.85,
        zIndex: 10,
        className: l.className || "",
        maxZoom: 18
      });
      let overlaySplit = L.tileLayer(l.url, {
        opacity: l.opacity || 0.85,
        zIndex: 10,
        className: l.className || "",
        maxZoom: 18
      });

      overlayLayersMain[l.id] = overlayMain;
      overlayLayersSplit[l.id] = overlaySplit;

      const overlayHtml = `
        <div class="layer-checkbox-item">
          <label class="layer-item-header">
            <input type="checkbox" data-overlay="${l.id}">
            <span>${l.name}</span>
          </label>
          ${l.description ? `<div class="layer-desc" style="font-size:11px; color:var(--text-dim); margin:2px 0 5px 22px; line-height:1.3;">${l.description}</div>` : ""}
          <div class="opacity-slider-wrapper" style="display:none;" id="opacityWrap_${l.id}">
            <span>Прозрачность:</span>
            <input type="range" min="0" max="1" step="0.05" value="${l.opacity || 0.85}" data-slider="${l.id}">
          </div>
        </div>
      `;
      el.overlayLayersOptions.insertAdjacentHTML("beforeend", overlayHtml);
    });

    el.overlayLayersOptions.addEventListener("change", function(e) {
      const overlayId = e.target.dataset.overlay;
      const sliderId = e.target.dataset.slider;

      if (overlayId) {
        const wrap = document.getElementById(`opacityWrap_${overlayId}`);
        if (e.target.checked) {
          overlayLayersMain[overlayId].addTo(mainMap);
          overlayLayersSplit[overlayId].addTo(splitMap);
          if (overlayId === "aerophoto_1944") {
            naraFootprintsMain.addTo(mainMap);
            naraFootprintsSplit.addTo(splitMap);
          }
          if (wrap) wrap.style.display = "flex";
        } else {
          mainMap.removeLayer(overlayLayersMain[overlayId]);
          splitMap.removeLayer(overlayLayersSplit[overlayId]);
          if (overlayId === "aerophoto_1944") {
            mainMap.removeLayer(naraFootprintsMain);
            splitMap.removeLayer(naraFootprintsSplit);
          }
          if (wrap) wrap.style.display = "none";
        }
      }

      if (sliderId && overlayLayersMain[sliderId]) {
        const op = parseFloat(e.target.value);
        overlayLayersMain[sliderId].setOpacity(op);
        overlayLayersSplit[sliderId].setOpacity(op);
      }
    });
  }

  /* ==========================================================================
     Vector Frontlines Geometry Layers
     ========================================================================== */
  function initVectorLayers() {
    const geojson = state.data.vectorFrontlines;
    if (!geojson) return;

    vectorLayer1941Main = L.geoJSON(geojson, {
      filter: feature => feature.properties.period === "1941",
      style: feature => ({
        color: feature.properties.color || "#e74c3c",
        weight: 3,
        dashArray: feature.properties.dashArray !== "None" ? feature.properties.dashArray : null,
        opacity: 0.8
      }),
      onEachFeature: (feature, layer) => {
        layer.bindTooltip(feature.properties.name, { sticky: true });
      }
    }).addTo(mainMap);

    vectorLayer1944Main = L.geoJSON(geojson, {
      filter: feature => feature.properties.period === "1944",
      style: feature => ({
        color: feature.properties.color || "#2ecc71",
        weight: 3,
        dashArray: feature.properties.dashArray !== "None" ? feature.properties.dashArray : null,
        opacity: 0.8
      }),
      onEachFeature: (feature, layer) => {
        layer.bindTooltip(feature.properties.name, { sticky: true });
      }
    }).addTo(mainMap);

    vectorLayer1941Split = L.geoJSON(geojson, {
      filter: feature => feature.properties.period === "1941",
      style: feature => ({
        color: feature.properties.color || "#e74c3c",
        weight: 3,
        dashArray: feature.properties.dashArray !== "None" ? feature.properties.dashArray : null,
        opacity: 0.85
      })
    }).addTo(splitMap);

    vectorLayer1944Split = L.geoJSON(geojson, {
      filter: feature => feature.properties.period === "1944",
      style: feature => ({
        color: feature.properties.color || "#2ecc71",
        weight: 3,
        dashArray: feature.properties.dashArray !== "None" ? feature.properties.dashArray : null,
        opacity: 0.85
      })
    }).addTo(splitMap);

    el.chkFrontlines1941.addEventListener("change", function(e) {
      if (e.target.checked) {
        mainMap.addLayer(vectorLayer1941Main);
        splitMap.addLayer(vectorLayer1941Split);
      } else {
        mainMap.removeLayer(vectorLayer1941Main);
        splitMap.removeLayer(vectorLayer1941Split);
      }
    });

    el.chkFrontlines1944.addEventListener("change", function(e) {
      if (e.target.checked) {
        mainMap.addLayer(vectorLayer1944Main);
        splitMap.addLayer(vectorLayer1944Split);
      } else {
        mainMap.removeLayer(vectorLayer1944Main);
        splitMap.removeLayer(vectorLayer1944Split);
      }
    });
  }

  /* ==========================================================================
     Markers Rendering Engine
     ========================================================================== */
  function getAllPoints() {
    return [...state.data.points, ...state.userPoints];
  }

  function initMarkers() {
    markersGroupMain.clearLayers();
    markersGroupSplit.clearLayers();

    const filteredPoints = getFilteredPoints();

    filteredPoints.forEach(pt => {
      const catConfig = state.data.categories[pt.category] || {
        icon: "map-pin",
        color: "#2ecc71"
      };

      const isHighPriority = pt.category === "prospective_burial";

      const customHtml = `
        <div class="tactical-leaflet-marker ${isHighPriority ? "marker-pulse" : ""}" 
             style="background-color: ${catConfig.color}; width:32px; height:32px;">
          <i class="fa-solid fa-${catConfig.icon}"></i>
        </div>
      `;

      const customIcon = L.divIcon({
        html: customHtml,
        className: "leaflet-tactical-wrapper",
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      const marker = L.marker([pt.lat, pt.lng], { icon: customIcon });
      marker.bindTooltip(`<b>${pt.code || pt.id}</b>: ${pt.name}`, { direction: "top", offset: [0, -10] });
      marker.on("click", function() {
        openDossierModal(pt);
      });
      markersGroupMain.addLayer(marker);

      const markerSplit = L.marker([pt.lat, pt.lng], { icon: customIcon });
      markersGroupSplit.addLayer(markerSplit);
    });
  }

  /* ==========================================================================
     Filtering & Search Engine
     ========================================================================== */
  function getFilteredPoints() {
    const all = getAllPoints();
    return all.filter(pt => {
      if (state.activePeriod !== "all") {
        if (!pt.period.includes(state.activePeriod)) return false;
      }
      if (state.activeCategory !== "all") {
        if (pt.category !== state.activeCategory) return false;
      }
      if (state.searchQuery.trim() !== "") {
        const q = state.searchQuery.toLowerCase();
        const matchName = pt.name.toLowerCase().includes(q);
        const matchCode = (pt.code || "").toLowerCase().includes(q);
        const matchUnit = (pt.unit || "").toLowerCase().includes(q);
        const matchDesc = (pt.description || "").toLowerCase().includes(q);
        const matchTsamo = (pt.tsamoRef || "").toLowerCase().includes(q);
        if (!matchName && !matchCode && !matchUnit && !matchDesc && !matchTsamo) return false;
      }
      return true;
    });
  }

  function renderPointsList() {
    const points = getFilteredPoints();
    const totalCount = getAllPoints().length;
    const filteredCount = points.length;

    el.pointsTabCount.textContent = filteredCount;
    if (el.filteredPointsCount) el.filteredPointsCount.textContent = filteredCount;
    if (el.totalPointsCount) el.totalPointsCount.textContent = totalCount;
    if (el.dockPointsBadge) el.dockPointsBadge.textContent = filteredCount;

    if (el.btnResetFilters) {
      const isFiltered = state.activePeriod !== "all" || state.activeCategory !== "all" || state.searchQuery.trim() !== "";
      el.btnResetFilters.style.display = isFiltered ? "inline-flex" : "none";
    }

    if (points.length === 0) {
      el.pointsList.innerHTML = `
        <div style="text-align:center; padding: 30px 10px; color: var(--text-muted);">
          <i class="fa-solid fa-filter-circle-xmark" style="font-size:32px; margin-bottom:8px;"></i>
          <p>По вашему фильтру объектов не найдено.</p>
        </div>
      `;
      return;
    }

    let html = "";
    points.forEach(pt => {
      const catConfig = state.data.categories[pt.category] || { label: pt.category, color: "#2ecc71" };
      const isSelected = pt.id === state.selectedPointId;

      // DYNAMIC SOURCE BADGE DETERMINATION
      const sourceBadge = pt.sourceBadge || (
        (pt.tsamoRef || "").includes("NARA") ? "Архив NARA (США)" :
        (pt.tsamoRef || "").includes("Лютик") ? "Д. Лютик / GRO-Registry" :
        (pt.tsamoRef || "").includes("ПО НКВД") ? "86 ПО НКВД" :
        (pt.tsamoRef || "").includes("Паспорт") ? "Воинский Мемориал" : "Досье ЦАМО"
      );

      // Short preview (first paragraph)
      const shortDesc = (pt.description || "").split("\n\n")[0] || "";

      html += `
        <div class="point-card ${isSelected ? "selected" : ""}" data-id="${pt.id}">
          <div class="point-card-header">
            <span class="point-code" style="background-color: ${catConfig.color}; color: #fff;">${pt.code || pt.id}</span>
            <span class="point-title">${pt.name}</span>
          </div>
          <div class="point-meta">
            <span class="point-meta-item"><i class="fa-solid fa-tag"></i> ${catConfig.label}</span>
            <span class="point-meta-item"><i class="fa-solid fa-calendar-days"></i> ${pt.period}</span>
            ${pt.estimatedCasualties ? `<span class="point-meta-item" style="color:var(--color-accent-amber);"><i class="fa-solid fa-skull"></i> ${pt.estimatedCasualties}</span>` : ""}
          </div>
          <div class="point-desc-short">${shortDesc}</div>
          <div class="point-card-actions">
            <span style="font-family:var(--font-mono); font-size:11px; color:var(--text-dim);">${pt.lat.toFixed(4)}°, ${pt.lng.toFixed(4)}°</span>
            <div style="display:flex; gap:6px; align-items:center;">
              <button class="btn btn-sm btn-success btn-nav-target" data-id="${pt.id}" title="Вести к цели (GPS компас)">
                <i class="fa-solid fa-location-arrow"></i>
              </button>
              ${pt.isUserCreated ? `
                <button class="btn btn-danger-sm btn-delete-user-point" data-id="${pt.id}" title="Удалить полевую точку">
                  <i class="fa-solid fa-trash"></i>
                </button>
              ` : ""}
              <button class="btn btn-sm btn-tactical btn-view-dossier" data-id="${pt.id}">
                <i class="fa-solid fa-folder-open"></i> ${sourceBadge}
              </button>
            </div>
          </div>
        </div>
      `;
    });

    el.pointsList.innerHTML = html;

    el.pointsList.querySelectorAll(".point-card").forEach(card => {
      card.addEventListener("click", function() {
        const ptId = this.dataset.id;
        const pt = getAllPoints().find(p => p.id === ptId);
        if (pt) {
          state.selectedPointId = ptId;
          renderPointsList();
          mainMap.flyTo([pt.lat, pt.lng], 14, { duration: 1.2 });
        }
      });
    });

    el.pointsList.querySelectorAll(".btn-view-dossier").forEach(btn => {
      btn.addEventListener("click", function(e) {
        e.stopPropagation();
        const ptId = this.dataset.id;
        const pt = getAllPoints().find(p => p.id === ptId);
        if (pt) openDossierModal(pt);
      });
    });

    el.pointsList.querySelectorAll(".btn-nav-target").forEach(btn => {
      btn.addEventListener("click", function(e) {
        e.stopPropagation();
        const ptId = this.dataset.id;
        const pt = getAllPoints().find(p => p.id === ptId);
        if (pt) {
          startNavigatingToPoint(pt);
          if (window.innerWidth <= 768) {
            el.sidebar.classList.add("collapsed");
            if (el.dockBtnMap) el.dockBtnMap.click();
          }
        }
      });
    });

    el.pointsList.querySelectorAll(".btn-delete-user-point").forEach(btn => {
      btn.addEventListener("click", function(e) {
        e.stopPropagation();
        const ptId = this.dataset.id;
        if (confirm("Вы уверены, что хотите удалить эту полевую точку?")) {
          state.userPoints = state.userPoints.filter(p => p.id !== ptId);
          localStorage.setItem("grodno_user_points", JSON.stringify(state.userPoints));
          initMarkers();
          renderPointsList();
          updateMetrics();
          showToast("Полевая точка успешно удалена", "info");
        }
      });
    });
  }

  /* ==========================================================================
     Battle Chronology Timeline (Interactive & Period Filtered)
     ========================================================================== */
  function renderChronology() {
    const chronology = state.data.chronology || [];
    const filtered = chronology.filter(c => {
      if (state.activePeriod === "all") return true;
      return c.period.includes(state.activePeriod);
    });

    let html = "";
    filtered.forEach(c => {
      html += `
        <div class="timeline-item" data-period="${c.period}" style="cursor:pointer;" title="Нажмите для перехода к сектору на карте">
          <div class="timeline-date"><i class="fa-solid fa-clock"></i> ${c.date}</div>
          <div class="timeline-title">${c.title}</div>
          <div style="font-size:11px; color:var(--color-accent-green); margin-bottom:4px;">
            <i class="fa-solid fa-shield-halved"></i> <b>Сектор:</b> ${c.sector}
          </div>
          <div class="timeline-text">${c.description}</div>
          <div style="font-size:11px; color:var(--text-muted); margin-bottom:6px;">
            <b>РККА:</b> ${c.unitsSoviet}<br/>
            <b>Вермахт:</b> ${c.unitsGerman}
          </div>
          <div class="timeline-archive"><i class="fa-solid fa-box-archive"></i> ${c.archiveSource}</div>
        </div>
      `;
    });

    el.chronologyList.innerHTML = html;

    el.chronologyList.querySelectorAll(".timeline-item").forEach(item => {
      item.addEventListener("click", function() {
        const period = this.dataset.period;
        if (period === "1941") {
          mainMap.flyTo([53.8189, 23.6145], 13, { duration: 1.2 });
          showToast("Фокус на секторе обороны 1941 г. (Сопоцкин / Новики)", "info");
        } else if (period === "1944") {
          mainMap.flyTo([53.7251, 23.8154], 13, { duration: 1.2 });
          showToast("Фокус на рубеже форсирования Немана 1944 г. (Пышки)", "info");
        }
      });
    });
  }

  /* ==========================================================================
     Archival Sources Catalog & Search Center Tab
     ========================================================================== */
  function getPointsMatchingArchiveSource(s) {
    const allPts = getAllPoints();
    if (!s.matchKeywords || s.matchKeywords.length === 0) return [];
    return allPts.filter(pt => {
      const searchStr = `${pt.name} ${pt.unit || ""} ${pt.tsamoRef || ""} ${pt.description || ""}`.toLowerCase();
      return s.matchKeywords.some(kw => searchStr.includes(kw.toLowerCase()));
    });
  }

  function getPointsDeclension(n) {
    if (n % 10 === 1 && n % 100 !== 11) return "объект";
    if ([2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100)) return "объекта";
    return "объектов";
  }

  function renderArchivalSources() {
    if (!el.sourcesList) return;
    let sources = state.data.archivalSources || [];

    // Filter by period
    if (state.archivePeriod && state.archivePeriod !== "all") {
      sources = sources.filter(s => s.period === state.archivePeriod || s.period === "1941/1944");
    }

    // Filter by search query
    if (state.archiveSearchQuery && state.archiveSearchQuery.trim() !== "") {
      const q = state.archiveSearchQuery.toLowerCase().trim();
      sources = sources.filter(s => {
        const text = `${s.code} ${s.name} ${s.commander || ""} ${s.role || ""} ${s.sector || ""} ${s.summary || ""} ${s.fondDetails || ""}`.toLowerCase();
        return text.includes(q);
      });
    }

    if (sources.length === 0) {
      el.sourcesList.innerHTML = `
        <div style="text-align:center; padding: 30px 10px; color: var(--text-muted);">
          <i class="fa-solid fa-folder-open" style="font-size:32px; margin-bottom:8px;"></i>
          <p>Архивных фондов по вашему запросу не найдено.</p>
        </div>
      `;
      return;
    }

    let html = "";
    sources.forEach(s => {
      const matchingPts = getPointsMatchingArchiveSource(s);
      const isFiltered = state.activeArchiveId === s.id;
      const periodClass = s.period === "1944" ? "period-1944" : (s.period === "foreign" ? "period-foreign" : "");

      html += `
        <div class="source-card ${periodClass} ${isFiltered ? "active-filtered" : ""}" data-id="${s.id}">
          <div class="source-card-top">
            <span class="source-code">${s.code}</span>
            <span class="source-points-count-badge">
              <i class="fa-solid fa-location-crosshairs"></i> ${matchingPts.length} ${getPointsDeclension(matchingPts.length)} на карте
            </span>
          </div>
          <div class="source-name">${s.name}</div>
          
          <div class="source-meta-block">
            ${s.commander ? `<div class="source-meta-item"><i class="fa-solid fa-user-shield"></i> <span><strong>Командир:</strong> ${s.commander}</span></div>` : ""}
            ${s.role ? `<div class="source-meta-item"><i class="fa-solid fa-shield-halved"></i> <span><strong>Роль:</strong> ${s.role}</span></div>` : ""}
            ${s.sector ? `<div class="source-meta-item"><i class="fa-solid fa-map-location-dot"></i> <span><strong>Сектор:</strong> ${s.sector}</span></div>` : ""}
          </div>

          <div class="source-summary-text">${s.summary || s.details || ""}</div>
          
          ${s.fondDetails ? `
            <div class="source-fond-details">
              <i class="fa-solid fa-box-archive" style="color:var(--color-accent-amber); margin-right:4px;"></i>
              <strong>Шифр ЦАМО/NARA:</strong> ${s.fondDetails}
            </div>
          ` : ""}

          ${s.specificDocs && s.specificDocs.length > 0 ? `
            <div class="source-docs-list">
              <div class="source-docs-title">
                <i class="fa-solid fa-file-circle-check"></i> Точные дела и документы фонда:
              </div>
              ${s.specificDocs.map(doc => {
                const icon = doc.type === "zhbd" ? "fa-book-journal-whills" : (doc.type === "map" ? "fa-map-location-dot" : (doc.type === "casualties" ? "fa-skull" : "fa-file-lines"));
                return `
                  <div class="source-doc-item" data-doc-id="${doc.id}" title="Кликните, чтобы открыть подлинный оцифрованный текст документа">
                    <div class="doc-icon"><i class="fa-solid ${icon}"></i></div>
                    <div class="doc-info">
                      <div class="doc-title">${doc.title}</div>
                      <div class="doc-code">${doc.archiveCode}</div>
                    </div>
                    <span class="doc-preview-badge"><i class="fa-solid fa-book-open"></i> Читать</span>
                  </div>
                `;
              }).join("")}
            </div>
          ` : ""}

          <div class="source-actions-bar">
            ${matchingPts.length > 0 ? `
              <button class="btn-source-action btn-source-map" data-id="${s.id}" title="Показать все объекты этого соединения на карте">
                <i class="fa-solid fa-map-pin"></i> На карту (${matchingPts.length})
              </button>
            ` : ""}
            ${s.pamyatNarodaUrl ? `
              <a class="btn-source-action btn-source-pamyat" href="${s.pamyatNarodaUrl}" target="_blank" rel="noopener" title="Открыть дела и схемы в ЦАМО на портале Память Народа">
                <i class="fa-solid fa-magnifying-glass"></i> Память Народа
              </a>
            ` : ""}
            ${s.obdMemorialUrl ? `
              <a class="btn-source-action btn-source-obd" href="${s.obdMemorialUrl}" target="_blank" rel="noopener" title="Списки потерь и захоронений в ОБД Мемориал">
                <i class="fa-solid fa-book-skull"></i> ОБД Мемориал
              </a>
            ` : ""}
            ${s.naraUrl ? `
              <a class="btn-source-action btn-source-nara" href="${s.naraUrl}" target="_blank" rel="noopener" title="Архив NARA (США)">
                <i class="fa-solid fa-globe"></i> NARA
              </a>
            ` : ""}
          </div>
        </div>
      `;
    });

    el.sourcesList.innerHTML = html;

    // Attach Click Handlers to Specific Documents
    el.sourcesList.querySelectorAll(".source-doc-item").forEach(item => {
      item.addEventListener("click", function(e) {
        e.stopPropagation();
        const docId = this.dataset.docId;
        if (docId) openArchiveDocModal(docId);
      });
    });

    // Attach Click Handlers to Cards and Map Action Buttons
    el.sourcesList.querySelectorAll(".btn-source-map, .source-card").forEach(item => {
      item.addEventListener("click", function(e) {
        if (e.target.closest("a") || e.target.closest(".source-doc-item")) return;
        const srcId = this.dataset.id || this.closest(".source-card").dataset.id;
        const source = (state.data.archivalSources || []).find(s => s.id === srcId);
        if (!source) return;

        const matchingPts = getPointsMatchingArchiveSource(source);
        if (matchingPts.length > 0) {
          state.activeArchiveId = srcId;
          // Apply search filter so points tab reflects this unit
          state.activePeriod = "all";
          state.activeCategory = "all";
          state.searchQuery = source.matchKeywords[0] || source.name;
          if (el.searchInput) el.searchInput.value = state.searchQuery;
          if (el.btnClearSearch) el.btnClearSearch.style.display = "block";

          initMarkers();
          renderPointsList();
          renderArchivalSources();

          // Fit map bounds to points
          const bounds = L.latLngBounds(matchingPts.map(p => [p.lat, p.lng]));
          mainMap.fitBounds(bounds, { padding: [60, 60], maxZoom: 14 });

          // Mobile UX: if on mobile screen, close drawer to show map immediately
          if (window.innerWidth <= 768) {
            el.sidebar.classList.add("collapsed");
            if (el.dockBtnMap) el.dockBtnMap.click();
          } else {
            // On desktop: switch to points tab so user sees the list of matching points
            const tabPointsBtn = document.querySelector('.tab-btn[data-tab="tabPoints"]');
            if (tabPointsBtn) tabPointsBtn.click();
          }

          showToast(`Отображено ${matchingPts.length} ${getPointsDeclension(matchingPts.length)} соединения «${source.name}»`, "success");
        } else {
          showToast(`Документальный фонд «${source.name}» не имеет прямых точечных привязок`, "info");
        }
      });
    });
  }

  /* ==========================================================================
     Archive Document Reader Modal
     ========================================================================== */
  let currentActiveDoc = null;

  function openArchiveDocModal(docId) {
    let foundDoc = null;
    let parentSource = null;

    (state.data.archivalSources || []).forEach(src => {
      (src.specificDocs || []).forEach(d => {
        if (d.id === docId) {
          foundDoc = d;
          parentSource = src;
        }
      });
    });

    if (!foundDoc) return;
    currentActiveDoc = { doc: foundDoc, source: parentSource };

    // Populate Fields
    if (el.docArchiveBadge) el.docArchiveBadge.textContent = parentSource ? parentSource.code : "ЦАМО РФ";
    if (el.docTitle) el.docTitle.textContent = foundDoc.title;
    if (el.docArchiveCode) el.docArchiveCode.textContent = foundDoc.archiveCode || "ЦАМО РФ";
    if (el.docDate) el.docDate.textContent = foundDoc.date || (parentSource ? parentSource.period : "1941");
    if (el.docAuthor) el.docAuthor.textContent = foundDoc.author || (parentSource ? parentSource.commander : "--");
    if (el.docSector) el.docSector.textContent = parentSource ? parentSource.sector : "Гродненский район";

    if (el.docFullText) {
      el.docFullText.innerHTML = foundDoc.fullText || `<p>${foundDoc.summary || ""}</p>`;
    }

    if (el.linkDocExternal) {
      el.linkDocExternal.href = foundDoc.url || parentSource.pamyatNarodaUrl || "#";
    }

    if (el.archiveDocModal) el.archiveDocModal.style.display = "flex";
  }

  /* ==========================================================================
     Memoirs & Photo Evidence Renderers
     ========================================================================== */
  function renderMemoirsAndPhotos() {
    const memoirs = state.data.memoirsAndEvidence || [];
    let htmlM = "";

    memoirs.forEach(m => {
      htmlM += `
        <div class="memoir-card">
          <div class="memoir-author">${m.author}</div>
          <div class="memoir-source"><i class="fa-solid fa-book-open"></i> ${m.source}</div>
          <div class="memoir-text">${m.text}</div>
        </div>
      `;
    });
    if (el.memoirsList) el.memoirsList.innerHTML = htmlM;

    const photos = state.data.photoArchive || [];
    let htmlP = "";

    photos.forEach(p => {
      htmlP += `
        <div class="photo-card">
          <div class="photo-title"><i class="fa-solid fa-image"></i> ${p.title}</div>
          <div class="photo-desc">${p.description}</div>
          <div class="photo-source"><i class="fa-solid fa-landmark"></i> Источник: ${p.source}</div>
        </div>
      `;
    });
    if (el.photoList) el.photoList.innerHTML = htmlP;
  }

  /* ==========================================================================
     Metrics Badges Counter
     ========================================================================== */
  function updateMetrics() {
    const all = getAllPoints();
    const memorials = all.filter(p => p.category === "official_memorial").length;
    const prospective = all.filter(p => p.category === "prospective_burial" || p.category === "san_burial").length;
    const userPointsCount = state.userPoints.length;

    el.statMemorialsCount.textContent = memorials;
    el.statProspectiveCount.textContent = prospective;
    el.statUserCount.textContent = userPointsCount;
  }

  /* ==========================================================================
     Modals & Dossier Handler (MULTI-PARAGRAPH FORMATTING + NAVIGATION LINKS)
     ========================================================================== */
  function updateDossierCoordsDisplay(pt) {
    if (!pt) return;
    if (state.coordsFormat === "DMS" && window.GPX_KML_UTILS) {
      el.dossierCoords.textContent = window.GPX_KML_UTILS.convertToDMS(pt.lat, pt.lng);
      if (el.coordsFormatLabel) el.coordsFormatLabel.textContent = "DD";
    } else {
      el.dossierCoords.textContent = `${pt.lat.toFixed(5)}° N, ${pt.lng.toFixed(5)}° E`;
      if (el.coordsFormatLabel) el.coordsFormatLabel.textContent = "DMS";
    }
  }

  function openDossierModal(pt) {
    currentDossierPoint = pt;
    const catConfig = state.data.categories[pt.category] || { label: pt.category, color: "#2ecc71" };

    el.dossierCodeBadge.textContent = pt.code || pt.id;
    el.dossierCodeBadge.style.backgroundColor = catConfig.color;
    el.dossierTitle.textContent = pt.name;
    el.dossierCategory.textContent = catConfig.label;
    el.dossierPeriod.textContent = pt.period || "1941/1944";
    el.dossierUnit.textContent = pt.unit || "Н/Д";
    el.dossierDepth.textContent = pt.depthEstimate || "Н/Д";
    el.dossierCasualties.textContent = pt.estimatedCasualties || "Н/Д";

    updateDossierCoordsDisplay(pt);

    // Update External Navigation Links
    if (el.linkNavYandex) el.linkNavYandex.href = `https://yandex.ru/maps/?pt=${pt.lng},${pt.lat}&z=16&l=sat`;
    if (el.linkNavGoogle) el.linkNavGoogle.href = `https://www.google.com/maps/search/?api=1&query=${pt.lat},${pt.lng}`;
    if (el.linkNavOSM) el.linkNavOSM.href = `https://www.openstreetmap.org/?mlat=${pt.lat}&mlon=${pt.lng}#map=16/${pt.lat}/${pt.lng}`;

    // Formatted 3-paragraph renderer with quote highlighting
    const rawDesc = pt.description || "Описание отсутствует.";
    const paragraphs = rawDesc.split("\n\n");
    const paragraphsHtml = paragraphs.map(p => {
      let text = p.trim();
      if (text.startsWith("«") || text.includes("ЦАМО") || text.includes("NARA") || text.includes("Из ЖБД") || text.includes("Из воспоминаний") || text.includes("Из отчета") || text.includes("Из монографии")) {
        return `<p style="margin-bottom:12px; line-height:1.6; font-size:12.5px; background: rgba(52, 152, 219, 0.08); border-left: 3px solid var(--color-accent-blue); padding: 8px 12px; border-radius: 0 4px 4px 0; font-style: italic;">${text}</p>`;
      }
      return `<p style="margin-bottom:12px; line-height:1.65; font-size:13px; text-align:justify; color: var(--text-primary);">${text}</p>`;
    }).join("");

    el.dossierDescription.innerHTML = paragraphsHtml;
    el.dossierArchiveRef.textContent = pt.tsamoRef || "Архивные ссылки уточняются.";
    el.dossierRecommendation.textContent = pt.recommendation || "Провести стандартное визуальное обследование.";

    // Deep search links for the specific point in TsAMO and OBD Memorial
    if (el.linkDossierPamyat) {
      const pamyatQuery = encodeURIComponent(`${pt.name} ${pt.unit || ""} ${pt.tsamoRef || ""}`.trim());
      el.linkDossierPamyat.href = `https://pamyat-naroda.ru/documents/?q=${pamyatQuery}`;
      el.linkDossierPamyat.title = `Искать документы в ЦАМО по объекту «${pt.name}»`;
    }
    if (el.linkDossierOBD) {
      const obdQuery = encodeURIComponent(`${pt.name} ${pt.unit || ""}`.trim());
      el.linkDossierOBD.href = `https://obd-memorial.ru/html/search.htm?fulltext=${obdQuery}`;
      el.linkDossierOBD.title = `Искать списки погибших воинов по объекту «${pt.name}» в ОБД Мемориал`;
    }

    el.dossierModal.style.display = "flex";
  }

  function openAddPointModal(lat = "", lng = "") {
    el.pointForm.reset();
    document.getElementById("iptLat").value = lat;
    document.getElementById("iptLng").value = lng;
    el.pointModal.style.display = "flex";
  }

  function closeModals() {
    document.querySelectorAll(".modal-backdrop").forEach(m => m.style.display = "none");
  }

  /* ==========================================================================
     Split Screen Swipe Engine («Было - Стало»)
     ========================================================================== */
  function toggleSplitScreen() {
    state.isSplitScreen = !state.isSplitScreen;

    if (state.isSplitScreen) {
      el.btnSplitScreen.classList.add("active");
      el.mapSplit.style.display = "block";
      el.splitDivider.style.display = "block";
      el.splitBadgeLeft.style.display = "block";
      el.splitBadgeRight.style.display = "block";
      splitMap.invalidateSize();
      splitMap.setView(mainMap.getCenter(), mainMap.getZoom(), { animate: false });
      updateSplitDivider(0.5);
    } else {
      el.btnSplitScreen.classList.remove("active");
      el.mapSplit.style.display = "none";
      el.splitDivider.style.display = "none";
      el.splitBadgeLeft.style.display = "none";
      el.splitBadgeRight.style.display = "none";
      mainMap.invalidateSize();
    }
  }

  function updateSplitDivider(ratio) {
    state.splitRatio = Math.max(0.05, Math.min(0.95, ratio));
    const percentage = state.splitRatio * 100;
    el.splitDivider.style.left = `${percentage}%`;
    el.mapSplit.style.clipPath = `inset(0 0 0 ${percentage}%)`;
  }

  /* ==========================================================================
     Measurement Tool Engine
     ========================================================================== */
  function toggleMeasureTool() {
    state.measureActive = !state.measureActive;
    el.map.classList.toggle("map-measuring", state.measureActive);

    if (state.measureActive) {
      el.btnMeasure.classList.add("active");
      el.measureToolbar.style.display = "block";
      clearMeasure();
    } else {
      el.btnMeasure.classList.remove("active");
      el.measureToolbar.style.display = "none";
      clearMeasure();
    }
  }

  function addMeasurePoint(latlng) {
    state.measurePoints.push(latlng);
    
    if (state.measurePolyline) {
      mainMap.removeLayer(state.measurePolyline);
    }

    state.measurePolyline = L.polyline(state.measurePoints, {
      color: "#f39c12",
      weight: 4,
      dashArray: "6, 6"
    }).addTo(mainMap);

    let totalDist = 0;
    for (let i = 0; i < state.measurePoints.length - 1; i++) {
      totalDist += state.measurePoints[i].distanceTo(state.measurePoints[i + 1]);
    }

    if (totalDist > 1000) {
      el.measureResult.textContent = `Дистанция траншеи/линии: ${(totalDist / 1000).toFixed(2)} км (${state.measurePoints.length} точек)`;
    } else {
      el.measureResult.textContent = `Дистанция траншеи/линии: ${Math.round(totalDist)} м (${state.measurePoints.length} точек)`;
    }
  }

  function clearMeasure() {
    state.measurePoints = [];
    if (state.measurePolyline) {
      mainMap.removeLayer(state.measurePolyline);
      state.measurePolyline = null;
    }
    el.measureResult.textContent = "Кликните по карте для начала измерения...";
  }

  /* ==========================================================================
     GPS Geodesic Formulas & Tactical Navigation Math
     ========================================================================== */
  function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000; // meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  function calculateBearing(lat1, lon1, lat2, lon2) {
    const y = Math.sin((lon2 - lon1) * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180);
    const x = Math.cos(lat1 * Math.PI / 180) * Math.sin(lat2 * Math.PI / 180) -
              Math.sin(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.cos((lon2 - lon1) * Math.PI / 180);
    const brng = Math.atan2(y, x) * 180 / Math.PI;
    return (brng + 360) % 360;
  }

  function getCardinalDirection(deg) {
    const directions = ["С", "СВ", "В", "ЮВ", "Ю", "ЮЗ", "З", "СЗ"];
    return directions[Math.round(deg / 45) % 8];
  }

  /* ==========================================================================
     Tactical GPS Live Tracking & Geolocation Engine
     ========================================================================== */
  function startLiveGpsTracking(follow = true) {
    if (!navigator.geolocation) {
      showToast("Геолокация не поддерживается вашим устройством", "error");
      return;
    }

    state.gps.followUser = follow;
    state.gps.isLiveTracking = true;
    if (el.btnLiveGpsToggle) el.btnLiveGpsToggle.classList.add("active");
    if (el.dockBtnGPS) el.dockBtnGPS.classList.add("active");

    if (state.gps.watchId !== null) {
      navigator.geolocation.clearWatch(state.gps.watchId);
    }

    showToast("GPS слежение активировано (Высокая точность)", "info");

    state.gps.watchId = navigator.geolocation.watchPosition(
      onGpsSuccess,
      onGpsError,
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 15000 }
    );
  }

  function stopLiveGpsTracking() {
    if (state.gps.watchId !== null) {
      navigator.geolocation.clearWatch(state.gps.watchId);
      state.gps.watchId = null;
    }
    state.gps.isLiveTracking = false;
    if (el.btnLiveGpsToggle) el.btnLiveGpsToggle.classList.remove("active");
    if (el.dockBtnGPS) el.dockBtnGPS.classList.remove("active");
    if (state.gps.accuracyCircle) {
      mainMap.removeLayer(state.gps.accuracyCircle);
      state.gps.accuracyCircle = null;
    }
    showToast("GPS слежение отключено", "info");
  }

  function toggleLiveGps() {
    if (state.gps.isLiveTracking) {
      stopLiveGpsTracking();
    } else {
      startLiveGpsTracking(true);
    }
  }

  function onGpsSuccess(pos) {
    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;
    const accuracy = pos.coords.accuracy || 10;
    const heading = pos.coords.heading;

    state.gps.userLatLng = [lat, lng];
    state.gps.accuracy = accuracy;
    state.gps.heading = heading;

    // Update user marker
    if (!state.userLocationMarker) {
      const iconHtml = `<div class="tactical-leaflet-marker marker-pulse" style="background:#3498db; width:26px; height:26px;"><i class="fa-solid fa-person-walking"></i></div>`;
      const icon = L.divIcon({ html: iconHtml, iconSize: [26, 26], iconAnchor: [13, 13] });
      state.userLocationMarker = L.marker([lat, lng], { icon: icon }).addTo(mainMap);
      state.userLocationMarker.bindTooltip("Вы здесь (GPS)").openTooltip();
    } else {
      state.userLocationMarker.setLatLng([lat, lng]);
    }

    // Update accuracy circle
    if (!state.gps.accuracyCircle) {
      state.gps.accuracyCircle = L.circle([lat, lng], {
        radius: accuracy,
        color: "#3498db",
        weight: 1,
        fillColor: "#3498db",
        fillOpacity: 0.15
      }).addTo(mainMap);
    } else {
      state.gps.accuracyCircle.setLatLng([lat, lng]);
      state.gps.accuracyCircle.setRadius(accuracy);
    }

    // Update HUD coordinates
    if (el.hudCoords) {
      el.hudCoords.innerHTML = `<i class="fa-solid fa-crosshairs" style="color:var(--color-accent-green);"></i> GPS: ${lat.toFixed(5)}°N, ${lng.toFixed(5)}°E (±${Math.round(accuracy)}м)`;
    }

    // If follow mode is on, pan map
    if (state.gps.followUser) {
      mainMap.setView([lat, lng], Math.max(mainMap.getZoom(), 15), { animate: true });
    }

    // Update Active Navigation to Target
    if (state.gps.navTarget) {
      updateNavigationHUD(lat, lng, accuracy);
    }

    // Update Track Recorder
    if (state.gps.isRecordingTrack) {
      addTrackPoint(lat, lng);
    }
  }

  function onGpsError(err) {
    console.warn("GPS tracking error:", err);
    showToast("Слабый сигнал GPS / Поиск спутников...", "warning");
  }

  function locateUserOnMap() {
    if (!navigator.geolocation) {
      showToast("Геолокация не поддерживается вашим браузером", "error");
      return;
    }

    showToast("Определение координат по спутникам GPS...", "info");

    navigator.geolocation.getCurrentPosition(
      position => {
        onGpsSuccess(position);
        mainMap.flyTo([position.coords.latitude, position.coords.longitude], 15, { duration: 1.5 });
        showToast(`Позиция определена: ${position.coords.latitude.toFixed(5)}°, ${position.coords.longitude.toFixed(5)}°`, "success");
      },
      err => {
        showToast("Ошибка GPS: " + err.message, "error");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  /* ==========================================================================
     Tactical GPS Target Navigation & Compass Engine
     ========================================================================== */
  function startNavigatingToPoint(pt) {
    state.gps.navTarget = pt;
    if (!state.gps.isLiveTracking) {
      startLiveGpsTracking(true);
    }
    
    if (el.gpsNavHud) el.gpsNavHud.style.display = "block";
    if (el.gpsNavTargetName) el.gpsNavTargetName.textContent = pt.name;

    if (state.gps.userLatLng) {
      updateNavigationHUD(state.gps.userLatLng[0], state.gps.userLatLng[1], state.gps.accuracy || 10);
      showToast(`Наведение на цель «${pt.name}» активно`, "success");
    } else {
      showToast(`Наведение на цель «${pt.name}» запущено. Ожидание GPS...`, "info");
      locateUserOnMap();
    }

    // Draw line between user and target
    if (state.gps.navPolyline) mainMap.removeLayer(state.gps.navPolyline);
    if (state.gps.userLatLng) {
      state.gps.navPolyline = L.polyline([state.gps.userLatLng, [pt.lat, pt.lng]], {
        color: "#2ecc71",
        weight: 3,
        dashArray: "8, 6"
      }).addTo(mainMap);
    }
  }

  function updateNavigationHUD(userLat, userLng, accuracy) {
    if (!state.gps.navTarget) return;
    const target = state.gps.navTarget;
    const distM = calculateDistance(userLat, userLng, target.lat, target.lng);
    const bearing = calculateBearing(userLat, userLng, target.lat, target.lng);
    const cardinal = getCardinalDirection(bearing);

    if (el.gpsDistanceVal) {
      el.gpsDistanceVal.textContent = distM > 1000 ? `${(distM / 1000).toFixed(2)} км` : `${Math.round(distM)} м`;
    }
    if (el.gpsBearingVal) {
      el.gpsBearingVal.textContent = `${Math.round(bearing)}° ${cardinal}`;
    }
    if (el.gpsAccuracyVal) {
      el.gpsAccuracyVal.textContent = `±${Math.round(accuracy)} м`;
    }

    // Rotate Compass Needle
    if (el.compassNeedle) {
      el.compassNeedle.style.transform = `rotate(${bearing}deg)`;
    }

    // Update Navigation Polyline
    if (state.gps.navPolyline) {
      state.gps.navPolyline.setLatLngs([[userLat, userLng], [target.lat, target.lng]]);
    } else {
      state.gps.navPolyline = L.polyline([[userLat, userLng], [target.lat, target.lng]], {
        color: "#2ecc71",
        weight: 3,
        dashArray: "8, 6"
      }).addTo(mainMap);
    }
  }

  function stopNavigating() {
    state.gps.navTarget = null;
    if (state.gps.navPolyline) {
      mainMap.removeLayer(state.gps.navPolyline);
      state.gps.navPolyline = null;
    }
    if (el.gpsNavHud) el.gpsNavHud.style.display = "none";
    showToast("Наведение на цель отключено", "info");
  }

  /* ==========================================================================
     GPS Track Recorder Engine
     ========================================================================== */
  function toggleTrackRecording() {
    state.gps.isRecordingTrack = !state.gps.isRecordingTrack;
    if (state.gps.isRecordingTrack) {
      if (!state.gps.isLiveTracking) startLiveGpsTracking(true);
      if (el.recordTrackBtnLabel) el.recordTrackBtnLabel.textContent = "Пауза";
      if (el.btnToggleRecordTrack) el.btnToggleRecordTrack.className = "btn btn-sm btn-warning";
      if (el.btnExportRecordedTrack) el.btnExportRecordedTrack.style.display = "inline-flex";
      if (el.btnClearRecordedTrack) el.btnClearRecordedTrack.style.display = "inline-flex";
      showToast("Запись полевого GPS трека начата", "success");
    } else {
      if (el.recordTrackBtnLabel) el.recordTrackBtnLabel.textContent = "Продолжить";
      if (el.btnToggleRecordTrack) el.btnToggleRecordTrack.className = "btn btn-sm btn-danger";
      showToast("Запись трека приостановлена", "info");
    }
  }

  function addTrackPoint(lat, lng) {
    state.gps.recordedTrackPoints.push([lat, lng]);
    if (!state.gps.recordedTrackPolyline) {
      state.gps.recordedTrackPolyline = L.polyline(state.gps.recordedTrackPoints, {
        color: "#e74c3c",
        weight: 4
      }).addTo(mainMap);
    } else {
      state.gps.recordedTrackPolyline.setLatLngs(state.gps.recordedTrackPoints);
    }

    // Compute total track length
    let len = 0;
    for (let i = 0; i < state.gps.recordedTrackPoints.length - 1; i++) {
      const p1 = state.gps.recordedTrackPoints[i];
      const p2 = state.gps.recordedTrackPoints[i+1];
      len += calculateDistance(p1[0], p1[1], p2[0], p2[1]);
    }
    if (el.trackLengthVal) el.trackLengthVal.textContent = len > 1000 ? `${(len / 1000).toFixed(2)} км` : `${Math.round(len)} м`;
    if (el.trackPointsCountVal) el.trackPointsCountVal.textContent = state.gps.recordedTrackPoints.length;
  }

  function clearRecordedTrack() {
    state.gps.recordedTrackPoints = [];
    if (state.gps.recordedTrackPolyline) {
      mainMap.removeLayer(state.gps.recordedTrackPolyline);
      state.gps.recordedTrackPolyline = null;
    }
    if (el.trackLengthVal) el.trackLengthVal.textContent = "0 м";
    if (el.trackPointsCountVal) el.trackPointsCountVal.textContent = "0";
    if (el.btnExportRecordedTrack) el.btnExportRecordedTrack.style.display = "none";
    if (el.btnClearRecordedTrack) el.btnClearRecordedTrack.style.display = "none";
    if (el.recordTrackBtnLabel) el.recordTrackBtnLabel.textContent = "Старт";
    showToast("Записанный трек очищен", "info");
  }

  /* ==========================================================================
     Device Orientation Physical Compass Sensor
     ========================================================================== */
  function initDeviceOrientation() {
    if (window.DeviceOrientationEvent) {
      window.addEventListener("deviceorientation", e => {
        if (e.webkitCompassHeading) {
          // iOS compass heading
          state.gps.heading = e.webkitCompassHeading;
        } else if (e.alpha !== null) {
          // Android device orientation
          state.gps.heading = 360 - e.alpha;
        }
      });
    }
  }

  /* ==========================================================================
     Mobile Bottom Navigation Dock Controller
     ========================================================================== */
  function initMobileDock() {
    if (!el.mobileBottomDock) return;

    const updateDockActive = btn => {
      document.querySelectorAll(".mobile-dock-btn").forEach(b => b.classList.remove("active"));
      if (btn) btn.classList.add("active");
    };

    el.dockBtnMap.addEventListener("click", () => {
      updateDockActive(el.dockBtnMap);
      el.sidebar.classList.add("collapsed");
      mainMap.invalidateSize();
    });

    el.dockBtnPoints.addEventListener("click", () => {
      updateDockActive(el.dockBtnPoints);
      el.sidebar.classList.remove("collapsed");
      const tabBtn = document.querySelector('.tab-btn[data-tab="tabPoints"]');
      if (tabBtn) tabBtn.click();
    });

    el.dockBtnLayers.addEventListener("click", () => {
      updateDockActive(el.dockBtnLayers);
      el.sidebar.classList.remove("collapsed");
      const tabBtn = document.querySelector('.tab-btn[data-tab="tabLayers"]');
      if (tabBtn) tabBtn.click();
    });

    el.dockBtnSplit.addEventListener("click", () => {
      toggleSplitScreen();
      el.dockBtnSplit.classList.toggle("active", state.isSplitScreen);
    });

    el.dockBtnGPS.addEventListener("click", () => {
      toggleLiveGps();
      if (state.gps.userLatLng) {
        mainMap.setView(state.gps.userLatLng, 15);
      }
    });

    if (el.btnSidebarCloseMobile) {
      el.btnSidebarCloseMobile.addEventListener("click", () => {
        el.sidebar.classList.add("collapsed");
        updateDockActive(el.dockBtnMap);
        mainMap.invalidateSize();
      });
    }
  }

  /* ==========================================================================
     UI Event Listeners & Hotkeys
     ========================================================================== */
  function initUIEvents() {
    el.btnToggleSidebar.addEventListener("click", () => {
      el.sidebar.classList.toggle("collapsed");
      setTimeout(() => mainMap.invalidateSize(), 300);
    });

    el.btnSplitScreen.addEventListener("click", toggleSplitScreen);

    let isDraggingDivider = false;
    const startDrag = () => isDraggingDivider = true;
    const stopDrag = () => isDraggingDivider = false;
    const moveDrag = e => {
      if (isDraggingDivider) {
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const rect = el.map.getBoundingClientRect();
        const ratio = (clientX - rect.left) / rect.width;
        updateSplitDivider(ratio);
      }
    };

    el.splitDivider.addEventListener("mousedown", startDrag);
    el.splitDivider.addEventListener("touchstart", startDrag);
    window.addEventListener("mouseup", stopDrag);
    window.addEventListener("touchend", stopDrag);
    window.addEventListener("mousemove", moveDrag);
    window.addEventListener("touchmove", moveDrag);

    el.btnAddPoint.addEventListener("click", () => openAddPointModal());
    el.btnExport.addEventListener("click", () => el.exportModal.style.display = "flex");
    if (el.btnHelp) el.btnHelp.addEventListener("click", () => el.helpModal.style.display = "flex");

    el.btnMeasure.addEventListener("click", toggleMeasureTool);
    el.btnCloseMeasure.addEventListener("click", toggleMeasureTool);
    el.btnClearMeasure.addEventListener("click", clearMeasure);
    
    // GPS Buttons
    el.btnLocateMe.addEventListener("click", locateUserOnMap);
    if (el.btnLiveGpsToggle) el.btnLiveGpsToggle.addEventListener("click", toggleLiveGps);
    if (el.btnGpsTrackRecorder) {
      el.btnGpsTrackRecorder.addEventListener("click", () => {
        el.trackRecorderHud.style.display = el.trackRecorderHud.style.display === "none" ? "block" : "none";
      });
    }

    if (el.btnCloseTrackRecorder) {
      el.btnCloseTrackRecorder.addEventListener("click", () => {
        el.trackRecorderHud.style.display = "none";
      });
    }

    if (el.btnToggleRecordTrack) {
      el.btnToggleRecordTrack.addEventListener("click", toggleTrackRecording);
    }

    if (el.btnClearRecordedTrack) {
      el.btnClearRecordedTrack.addEventListener("click", clearRecordedTrack);
    }

    if (el.btnExportRecordedTrack) {
      el.btnExportRecordedTrack.addEventListener("click", () => {
        if (state.gps.recordedTrackPoints.length > 0 && window.GPX_KML_UTILS) {
          const trackPoints = state.gps.recordedTrackPoints.map((pt, i) => ({
            id: `trk-${i}`,
            name: `Track Point ${i+1}`,
            lat: pt[0],
            lng: pt[1],
            period: "1941/1944"
          }));
          window.GPX_KML_UTILS.exportToGPX(trackPoints, "grodno_field_track.gpx");
          showToast("Полевой GPS-трек выгружен в GPX", "success");
        }
      });
    }

    // GPS Target Navigation HUD Actions
    if (el.btnStopGpsNav) el.btnStopGpsNav.addEventListener("click", stopNavigating);
    if (el.btnCenterUserGps) {
      el.btnCenterUserGps.addEventListener("click", () => {
        if (state.gps.userLatLng) mainMap.setView(state.gps.userLatLng, 16);
      });
    }
    if (el.btnCenterTargetGps) {
      el.btnCenterTargetGps.addEventListener("click", () => {
        if (state.gps.navTarget) mainMap.setView([state.gps.navTarget.lat, state.gps.navTarget.lng], 16);
      });
    }
    if (el.btnToggleFollowMode) {
      el.btnToggleFollowMode.addEventListener("click", () => {
        state.gps.followUser = !state.gps.followUser;
        if (el.followModeLabel) el.followModeLabel.textContent = state.gps.followUser ? "Слежение" : "Свободно";
        el.btnToggleFollowMode.classList.toggle("btn-success", state.gps.followUser);
        el.btnToggleFollowMode.classList.toggle("btn-secondary", !state.gps.followUser);
        showToast(state.gps.followUser ? "Автоследование карте включено" : "Автоследование отключено", "info");
      });
    }

    // Dossier GPS Target Navigation Button
    if (el.btnDossierNavigateGPS) {
      el.btnDossierNavigateGPS.addEventListener("click", () => {
        if (currentDossierPoint) {
          closeModals();
          startNavigatingToPoint(currentDossierPoint);
        }
      });
    }

    document.querySelectorAll("[data-close]").forEach(btn => {
      btn.addEventListener("click", closeModals);
    });

    // Reset Filters Handler
    if (el.btnResetFilters) {
      el.btnResetFilters.addEventListener("click", () => {
        state.activePeriod = "all";
        state.activeCategory = "all";
        state.searchQuery = "";
        el.searchInput.value = "";
        el.btnClearSearch.style.display = "none";
        el.categoryFilter.value = "all";
        el.periodFilter.querySelectorAll(".pill").forEach(p => {
          p.classList.toggle("active", p.dataset.period === "all");
        });
        initMarkers();
        renderPointsList();
        renderChronology();
        showToast("Фильтры сброшены", "info");
      });
    }

    // Point Modal Coordinate Helpers
    if (el.btnPickMapCoords) {
      el.btnPickMapCoords.addEventListener("click", () => {
        closeModals();
        state.isPickingCoords = true;
        el.map.classList.add("map-measuring");
        showToast("Кликните на карте для установки координат точки", "info");
        state.pickCoordsCallback = function(latlng) {
          openAddPointModal(latlng.lat.toFixed(6), latlng.lng.toFixed(6));
          showToast(`Координаты зафиксированы: ${latlng.lat.toFixed(5)}°, ${latlng.lng.toFixed(5)}°`, "success");
        };
      });
    }

    if (el.btnFillMapCenter) {
      el.btnFillMapCenter.addEventListener("click", () => {
        const center = mainMap.getCenter();
        document.getElementById("iptLat").value = center.lat.toFixed(6);
        document.getElementById("iptLng").value = center.lng.toFixed(6);
        showToast("Вставлены координаты центра экрана", "success");
      });
    }

    if (el.btnFillGPS) {
      el.btnFillGPS.addEventListener("click", () => {
        if (!navigator.geolocation) {
          showToast("Геолокация не поддерживается", "error");
          return;
        }
        navigator.geolocation.getCurrentPosition(pos => {
          document.getElementById("iptLat").value = pos.coords.latitude.toFixed(6);
          document.getElementById("iptLng").value = pos.coords.longitude.toFixed(6);
          showToast("Вставлены текущие GPS координаты", "success");
        }, err => {
          showToast("Ошибка GPS: " + err.message, "error");
        });
      });
    }

    // Toggle Coords Format (DD / DMS)
    if (el.btnToggleCoordsFormat) {
      el.btnToggleCoordsFormat.addEventListener("click", () => {
        state.coordsFormat = state.coordsFormat === "DD" ? "DMS" : "DD";
        updateDossierCoordsDisplay(currentDossierPoint);
      });
    }

    // Copy Coordinates Button
    el.btnCopyCoords.addEventListener("click", () => {
      if (currentDossierPoint) {
        const coordsStr = `${currentDossierPoint.lat.toFixed(6)}, ${currentDossierPoint.lng.toFixed(6)}`;
        navigator.clipboard.writeText(coordsStr).then(() => {
          showToast(`Координаты скопированы в буфер: ${coordsStr}`, "success");
        }).catch(() => {
          showToast(`Координаты: ${coordsStr}`, "info");
        });
      }
    });

    // Print Dossier
    if (el.btnDossierPrint) {
      el.btnDossierPrint.addEventListener("click", () => {
        if (currentDossierPoint && window.GPX_KML_UTILS && el.printSection) {
          el.printSection.innerHTML = window.GPX_KML_UTILS.generatePrintableFieldSheet([currentDossierPoint]);
          window.print();
        }
      });
    }

    el.btnDossierFocusMap.addEventListener("click", () => {
      if (currentDossierPoint) {
        closeModals();
        mainMap.flyTo([currentDossierPoint.lat, currentDossierPoint.lng], 15, { duration: 1.2 });
      }
    });

    el.btnDossierExportGPX.addEventListener("click", () => {
      if (currentDossierPoint && window.GPX_KML_UTILS) {
        window.GPX_KML_UTILS.exportToGPX([currentDossierPoint], `${currentDossierPoint.code || "point"}.gpx`);
        showToast(`GPX для точки ${currentDossierPoint.code || ""} скачан`, "success");
      }
    });

    // Archive Document Modal Actions
    if (el.btnDocShowOnMap) {
      el.btnDocShowOnMap.addEventListener("click", () => {
        if (!currentActiveDoc) return;
        const { doc, source } = currentActiveDoc;
        closeModals();

        if (doc.targetPointId) {
          const pt = getAllPoints().find(p => p.id === doc.targetPointId);
          if (pt) {
            mainMap.flyTo([pt.lat, pt.lng], 16, { duration: 1.2 });
            showToast(`Сектор документа «${doc.title}» локализован на карте`, "success");
            if (window.innerWidth <= 768) {
              el.sidebar.classList.add("collapsed");
              if (el.dockBtnMap) el.dockBtnMap.click();
            }
            return;
          }
        }

        // Fallback: show all points of this unit
        if (source) {
          const matchingPts = getPointsMatchingArchiveSource(source);
          if (matchingPts.length > 0) {
            const bounds = L.latLngBounds(matchingPts.map(p => [p.lat, p.lng]));
            mainMap.fitBounds(bounds, { padding: [60, 60], maxZoom: 14 });
            showToast(`Сектор соединения «${source.name}» отображен на карте`, "info");
            if (window.innerWidth <= 768) {
              el.sidebar.classList.add("collapsed");
              if (el.dockBtnMap) el.dockBtnMap.click();
            }
          }
        }
      });
    }

    if (el.btnDocCopyCitation) {
      el.btnDocCopyCitation.addEventListener("click", () => {
        if (!currentActiveDoc) return;
        const { doc } = currentActiveDoc;
        const citation = `«${doc.title}» [${doc.archiveCode}] — ${doc.date || ""}. Составитель: ${doc.author || ""}`;
        navigator.clipboard.writeText(citation).then(() => {
          showToast("Архивная цитата и шифр скопированы в буфер обмена", "success");
        }).catch(() => {
          showToast(citation, "info");
        });
      });
    }

    document.querySelectorAll(".sidebar-tabs .tab-btn").forEach(btn => {
      btn.addEventListener("click", function() {
        document.querySelectorAll(".sidebar-tabs .tab-btn").forEach(b => b.classList.remove("active"));
        document.querySelectorAll(".tab-pane").forEach(p => p.classList.remove("active"));

        this.classList.add("active");
        const targetTab = document.getElementById(this.dataset.tab);
        if (targetTab) targetTab.classList.add("active");
      });
    });

    el.searchInput.addEventListener("input", function() {
      state.searchQuery = this.value;
      el.btnClearSearch.style.display = this.value ? "block" : "none";
      initMarkers();
      renderPointsList();
    });

    el.btnClearSearch.addEventListener("click", function() {
      el.searchInput.value = "";
      state.searchQuery = "";
      this.style.display = "none";
      initMarkers();
      renderPointsList();
    });

    // Archival Center Search & Period Filters
    if (el.archiveSearchInput) {
      el.archiveSearchInput.addEventListener("input", function() {
        state.archiveSearchQuery = this.value;
        if (el.btnClearArchiveSearch) el.btnClearArchiveSearch.style.display = this.value ? "block" : "none";
        renderArchivalSources();
      });
    }

    if (el.btnClearArchiveSearch) {
      el.btnClearArchiveSearch.addEventListener("click", function() {
        if (el.archiveSearchInput) el.archiveSearchInput.value = "";
        state.archiveSearchQuery = "";
        this.style.display = "none";
        renderArchivalSources();
      });
    }

    if (el.archivePeriodFilter) {
      el.archivePeriodFilter.querySelectorAll(".pill").forEach(pill => {
        pill.addEventListener("click", function() {
          el.archivePeriodFilter.querySelectorAll(".pill").forEach(p => p.classList.remove("active"));
          this.classList.add("active");
          state.archivePeriod = this.dataset.archivePeriod;
          renderArchivalSources();
        });
      });
    }

    el.periodFilter.querySelectorAll(".pill").forEach(pill => {
      pill.addEventListener("click", function() {
        el.periodFilter.querySelectorAll(".pill").forEach(p => p.classList.remove("active"));
        this.classList.add("active");
        state.activePeriod = this.dataset.period;
        initMarkers();
        renderPointsList();
        renderChronology();
      });
    });

    el.categoryFilter.addEventListener("change", function() {
      state.activeCategory = this.value;
      initMarkers();
      renderPointsList();
    });

    el.pointForm.addEventListener("submit", function(e) {
      e.preventDefault();
      const lat = parseFloat(document.getElementById("iptLat").value);
      const lng = parseFloat(document.getElementById("iptLng").value);
      const name = document.getElementById("iptName").value;

      if (isNaN(lat) || isNaN(lng) || !name) {
        showToast("Пожалуйста, заполните корректно название и координаты WGS84", "warning");
        return;
      }

      const newPt = {
        id: "user-pt-" + Date.now(),
        code: "FLD-NEW-" + (state.userPoints.length + 1),
        name: name,
        lat: lat,
        lng: lng,
        category: document.getElementById("iptCategory").value,
        period: document.getElementById("iptPeriod").value,
        unit: document.getElementById("iptUnit").value || "Полевая находка",
        depthEstimate: document.getElementById("iptDepth").value || "0.5 - 1.0 м",
        estimatedCasualties: document.getElementById("iptCasualties").value || "Н/Д",
        status: "Новая полевая точка",
        description: document.getElementById("iptDescription").value || "",
        recommendation: document.getElementById("iptRecommendation").value || "",
        isUserCreated: true
      };

      state.userPoints.push(newPt);
      localStorage.setItem("grodno_user_points", JSON.stringify(state.userPoints));

      closeModals();
      initMarkers();
      renderPointsList();
      updateMetrics();
      mainMap.flyTo([lat, lng], 14);
      showToast(`Точка «${newPt.name}» успешно добавлена`, "success");
    });

    // Export Handlers
    if (el.btnExportGPXAll) {
      el.btnExportGPXAll.addEventListener("click", () => {
        if (window.GPX_KML_UTILS) {
          window.GPX_KML_UTILS.exportToGPX(getAllPoints(), "grodno_expedition_full.gpx");
          showToast("GPX файл со всеми точками выгружен", "success");
        }
      });
    }

    if (el.btnExportGPXProspective) {
      el.btnExportGPXProspective.addEventListener("click", () => {
        if (window.GPX_KML_UTILS) {
          const prospective = getAllPoints().filter(p => p.category === "prospective_burial" || p.category === "san_burial");
          window.GPX_KML_UTILS.exportToGPX(prospective, "grodno_prospective_burials.gpx");
          showToast(`Выгружено ${prospective.length} перспективных точек в GPX`, "success");
        }
      });
    }

    if (el.btnExportKMLAll) {
      el.btnExportKMLAll.addEventListener("click", () => {
        if (window.GPX_KML_UTILS) {
          window.GPX_KML_UTILS.exportToKML(getAllPoints(), "grodno_expedition_full.kml");
          showToast("KML файл для Google Earth выгружен", "success");
        }
      });
    }

    if (el.btnExportGeoJSON) {
      el.btnExportGeoJSON.addEventListener("click", () => {
        if (window.GPX_KML_UTILS) {
          window.GPX_KML_UTILS.exportToGeoJSON(getAllPoints(), "grodno_expedition_points.geojson");
          showToast("GeoJSON файл для QGIS / ArcGIS выгружен", "success");
        }
      });
    }

    if (el.btnPrintFieldSheet) {
      el.btnPrintFieldSheet.addEventListener("click", () => {
        if (window.GPX_KML_UTILS && el.printSection) {
          const pointsToPrint = getFilteredPoints();
          el.printSection.innerHTML = window.GPX_KML_UTILS.generatePrintableFieldSheet(pointsToPrint);
          window.print();
        }
      });
    }

    // GPX Drag & Drop Upload
    const dropZone = document.getElementById("gpxDropZone");
    const fileInput = document.getElementById("gpxFileInput");

    if (dropZone && fileInput) {
      dropZone.addEventListener("click", () => fileInput.click());
      dropZone.addEventListener("dragover", e => {
        e.preventDefault();
        dropZone.style.borderColor = "var(--color-accent-green)";
      });
      dropZone.addEventListener("dragleave", () => {
        dropZone.style.borderColor = "var(--border-highlight)";
      });
      dropZone.addEventListener("drop", e => {
        e.preventDefault();
        dropZone.style.borderColor = "var(--border-highlight)";
        if (e.dataTransfer.files.length > 0) {
          handleGPXFile(e.dataTransfer.files[0]);
        }
      });

      fileInput.addEventListener("change", e => {
        if (e.target.files.length > 0) {
          handleGPXFile(e.target.files[0]);
        }
      });
    }

    // Global Hotkeys Listener
    document.addEventListener("keydown", function(e) {
      if (["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName)) {
        if (e.key === "Escape") {
          document.activeElement.blur();
        }
        return;
      }
      if (e.key === "Escape") {
        closeModals();
        if (state.measureActive) toggleMeasureTool();
      } else if (e.key === "m" || e.key === "M" || e.key === "ь" || e.key === "Ь") {
        toggleMeasureTool();
        showToast(state.measureActive ? "Линейка включена (кликните для замера)" : "Линейка выключена", "info");
      } else if (e.key === "s" || e.key === "S" || e.key === "ы" || e.key === "Ы") {
        toggleSplitScreen();
        showToast(state.isSplitScreen ? "Режим «Было - Стало» активирован" : "Режим «Было - Стало» выключен", "info");
      } else if (e.key === "l" || e.key === "L" || e.key === "д" || e.key === "Д") {
        locateUserOnMap();
      } else if (e.key === "/") {
        e.preventDefault();
        if (el.searchInput) el.searchInput.focus();
      }
    });
  }

  function handleGPXFile(file) {
    const reader = new FileReader();
    reader.onload = function(evt) {
      if (window.GPX_KML_UTILS) {
        const imported = window.GPX_KML_UTILS.parseGPX(evt.target.result);
        if (imported.length > 0) {
          state.userPoints.push(...imported);
          localStorage.setItem("grodno_user_points", JSON.stringify(state.userPoints));
          closeModals();
          initMarkers();
          renderPointsList();
          updateMetrics();
          showToast(`Импортировано ${imported.length} точек из ${file.name}`, "success");
        } else {
          showToast("Не удалось извлечь точки из файла GPX. Проверьте формат XML", "error");
        }
      }
    };
    reader.readAsText(file);
  }
});

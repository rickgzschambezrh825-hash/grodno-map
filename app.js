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
    pickCoordsCallback: null
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
    linkNavYandex: document.getElementById("linkNavYandex"),
    linkNavGoogle: document.getElementById("linkNavGoogle"),
    linkNavOSM: document.getElementById("linkNavOSM"),
    
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

    // Historical Overlay Layers Setup
    const overlays = layers.filter(l => l.isOverlay);
    overlays.forEach(l => {
      let overlayMain = L.tileLayer(l.url, { attribution: l.attribution, opacity: l.opacity || 0.7, zIndex: 10 });
      let overlaySplit = L.tileLayer(l.url, { opacity: l.opacity || 0.7, zIndex: 10 });

      overlayLayersMain[l.id] = overlayMain;
      overlayLayersSplit[l.id] = overlaySplit;

      const overlayHtml = `
        <div class="layer-checkbox-item">
          <label class="layer-item-header">
            <input type="checkbox" data-overlay="${l.id}">
            <span>${l.name}</span>
          </label>
          <div class="opacity-slider-wrapper" style="display:none;" id="opacityWrap_${l.id}">
            <span>Прозрачность:</span>
            <input type="range" min="0" max="1" step="0.05" value="${l.opacity || 0.7}" data-slider="${l.id}">
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
          if (wrap) wrap.style.display = "flex";
        } else {
          mainMap.removeLayer(overlayLayersMain[overlayId]);
          splitMap.removeLayer(overlayLayersSplit[overlayId]);
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
     Archival Sources Catalog Tab
     ========================================================================== */
  function renderArchivalSources() {
    const sources = state.data.archivalSources || [];
    let html = "";

    sources.forEach(s => {
      html += `
        <div class="source-card">
          <span class="source-code">${s.code}</span>
          <div class="source-name">${s.name}</div>
          <div class="source-details">${s.details}</div>
        </div>
      `;
    });

    el.sourcesList.innerHTML = html;
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
     GPS Geolocation Handler
     ========================================================================== */
  function locateUserOnMap() {
    if (!navigator.geolocation) {
      showToast("Геолокация не поддерживается вашим браузером", "error");
      return;
    }

    showToast("Определение GPS координат...", "info");

    navigator.geolocation.getCurrentPosition(
      position => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        if (state.userLocationMarker) {
          mainMap.removeLayer(state.userLocationMarker);
        }

        const iconHtml = `<div class="tactical-leaflet-marker marker-pulse" style="background:#3498db; width:24px; height:24px;"><i class="fa-solid fa-user"></i></div>`;
        const icon = L.divIcon({ html: iconHtml, iconSize: [24, 24], iconAnchor: [12, 12] });

        state.userLocationMarker = L.marker([lat, lng], { icon: icon }).addTo(mainMap);
        state.userLocationMarker.bindTooltip("Вы здесь (GPS)").openTooltip();
        mainMap.flyTo([lat, lng], 15, { duration: 1.5 });
        showToast(`Позиция определена: ${lat.toFixed(5)}°, ${lng.toFixed(5)}°`, "success");
      },
      err => {
        showToast("Ошибка GPS геолокации: " + err.message, "error");
      },
      { enableHighAccuracy: true }
    );
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
    el.btnLocateMe.addEventListener("click", locateUserOnMap);

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

/**
 * Utility functions for exporting and importing GPX and KML files
 * for handheld GPS devices (Garmin) and mobile navigation apps (OsmAnd, Locus Map).
 */

window.GPX_KML_UTILS = {
  /**
   * Export array of point objects to GPX format and trigger file download
   * @param {Array} points Array of point objects
   * @param {String} filename Output file name
   */
  exportToGPX: function(points, filename = "grodno_expedition_points.gpx") {
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<gpx version="1.1" creator="Grodno WWII Web-GIS Search Platform" xmlns="http://www.topografix.com/GPX/1/1">\n`;
    xml += `  <metadata>\n`;
    xml += `    <name>Экспедиция Гродненский район - Поисковые объекты</name>\n`;
    xml += `    <desc>Точки официальных мемориалов и перспективных неучтенных захоронений Великой Отечественной войны</desc>\n`;
    xml += `    <time>${new Date().toISOString()}</time>\n`;
    xml += `  </metadata>\n`;

    points.forEach(pt => {
      xml += `  <wpt lat="${pt.lat}" lon="${pt.lng}">\n`;
      xml += `    <name>${this.escapeXML(pt.code || pt.id)}: ${this.escapeXML(pt.name)}</name>\n`;
      xml += `    <desc>Категория: ${this.escapeXML(pt.category || "Объект")} | Период: ${this.escapeXML(pt.period || "1941-1944")} | Воинское подразделение: ${this.escapeXML(pt.unit || "Н/Д")}\nОписание: ${this.escapeXML(pt.description || "")}\nРекомендации: ${this.escapeXML(pt.recommendation || "")}</desc>\n`;
      xml += `    <sym>${pt.category === 'official_memorial' ? 'Flag, Red' : 'Waypoint'}</sym>\n`;
      xml += `    <type>${this.escapeXML(pt.category || 'SearchPoint')}</type>\n`;
      xml += `  </wpt>\n`;
    });

    xml += `</gpx>`;

    this.downloadFile(xml, filename, "application/gpx+xml");
  },

  /**
   * Export array of point objects to KML format (Google Earth, OsmAnd)
   * @param {Array} points Array of point objects
   * @param {String} filename Output file name
   */
  exportToKML: function(points, filename = "grodno_expedition_points.kml") {
    let kml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    kml += `<kml xmlns="http://www.opengis.net/kml/2.2">\n`;
    kml += `  <Document>\n`;
    kml += `    <name>Гродненская Поисковая Экспедиция - Картотека Точек</name>\n`;
    kml += `    <description>Геоинформационная система поиска неучтенных захоронений 1941/1944</description>\n`;

    // Define Styles
    kml += `    <Style id="official_memorial">\n`;
    kml += `      <IconStyle><color>ff0000ff</color><scale>1.2</scale></IconStyle>\n`;
    kml += `    </Style>\n`;
    kml += `    <Style id="prospective_burial">\n`;
    kml += `      <IconStyle><color>ff00a5ff</color><scale>1.2</scale></IconStyle>\n`;
    kml += `    </Style>\n`;
    kml += `    <Style id="san_burial">\n`;
    kml += `      <IconStyle><color>ff0080ff</color><scale>1.1</scale></IconStyle>\n`;
    kml += `    </Style>\n`;
    kml += `    <Style id="default_style">\n`;
    kml += `      <IconStyle><color>ff00ff00</color><scale>1.0</scale></IconStyle>\n`;
    kml += `    </Style>\n`;

    points.forEach(pt => {
      let styleId = pt.category || "default_style";
      kml += `    <Placemark>\n`;
      kml += `      <name>${this.escapeXML(pt.name)} [${this.escapeXML(pt.code || pt.id)}]</name>\n`;
      kml += `      <description><![CDATA[\n`;
      kml += `        <b>Категория:</b> ${pt.category}<br/>\n`;
      kml += `        <b>Подразделение:</b> ${pt.unit || "Н/Д"}<br/>\n`;
      kml += `        <b>Оценка глубины:</b> ${pt.depthEstimate || "Н/Д"}<br/>\n`;
      kml += `        <b>Потери:</b> ${pt.estimatedCasualties || "Н/Д"}<br/>\n`;
      kml += `        <b>Описание:</b> ${pt.description || ""}<br/>\n`;
      kml += `        <b>Рекомендации:</b> ${pt.recommendation || ""}\n`;
      kml += `      ]]></description>\n`;
      kml += `      <styleUrl>#${styleId}</styleUrl>\n`;
      kml += `      <Point>\n`;
      kml += `        <coordinates>${pt.lng},${pt.lat},0</coordinates>\n`;
      kml += `      </Point>\n`;
      kml += `    </Placemark>\n`;
    });

    kml += `  </Document>\n`;
    kml += `</kml>`;

    this.downloadFile(kml, filename, "application/vnd.google-earth.kml+xml");
  },

  /**
   * Parse GPX string into point objects
   * @param {String} gpxText 
   * @returns {Array} Array of parsed points
   */
  parseGPX: function(gpxText) {
    let parsedPoints = [];
    try {
      let parser = new DOMParser();
      let xmlDoc = parser.parseFromString(gpxText, "text/xml");
      let wpts = xmlDoc.getElementsByTagName("wpt");

      for (let i = 0; i < wpts.length; i++) {
        let wpt = wpts[i];
        let lat = parseFloat(wpt.getAttribute("lat"));
        let lng = parseFloat(wpt.getAttribute("lon"));
        let nameEl = wpt.getElementsByTagName("name")[0];
        let descEl = wpt.getElementsByTagName("desc")[0];

        if (!isNaN(lat) && !isNaN(lng)) {
          parsedPoints.push({
            id: "user-gpx-" + Date.now() + "-" + i,
            code: "GPX-IMP-" + (i + 1),
            name: nameEl ? nameEl.textContent : "Импортированная точка #" + (i + 1),
            lat: lat,
            lng: lng,
            category: "field_finding",
            period: "1941/1944",
            unit: "Импорт GPX",
            depthEstimate: "0.5 - 1.0 м",
            estimatedCasualties: "Н/Д",
            status: "Импортировано из GPS",
            description: descEl ? descEl.textContent : "Точка загружена из пользовательского файла GPX",
            recommendation: "Проверить на месте экспедиции.",
            isUserCreated: true
          });
        }
      }
    } catch (e) {
      console.error("Ошибка парсинга GPX файла:", e);
    }
    return parsedPoints;
  },

  /**
   * Export array of points to GeoJSON format
   * @param {Array} points Array of point objects
   * @param {String} filename Output file name
   */
  exportToGeoJSON: function(points, filename = "grodno_expedition_points.geojson") {
    const geojson = {
      type: "FeatureCollection",
      features: points.map(pt => ({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [pt.lng, pt.lat]
        },
        properties: {
          id: pt.id,
          code: pt.code || pt.id,
          name: pt.name,
          category: pt.category,
          period: pt.period,
          unit: pt.unit || "",
          depthEstimate: pt.depthEstimate || "",
          estimatedCasualties: pt.estimatedCasualties || "",
          description: pt.description || "",
          tsamoRef: pt.tsamoRef || "",
          recommendation: pt.recommendation || ""
        }
      }))
    };

    this.downloadFile(JSON.stringify(geojson, null, 2), filename, "application/geo+json");
  },

  /**
   * Convert Decimal Degrees to DMS format (Degrees Minutes Seconds)
   * @param {Number} lat 
   * @param {Number} lng 
   * @returns {String} e.g. 53°49′50″N, 23°38′40″E
   */
  convertToDMS: function(lat, lng) {
    function toDMS(val, pos, neg) {
      const dir = val >= 0 ? pos : neg;
      const abs = Math.abs(val);
      const deg = Math.floor(abs);
      const minFloat = (abs - deg) * 60;
      const min = Math.floor(minFloat);
      const sec = ((minFloat - min) * 60).toFixed(1);
      return `${deg}°${min.toString().padStart(2, '0')}′${sec.padStart(4, '0')}″${dir}`;
    }
    return `${toDMS(lat, 'N', 'S')}, ${toDMS(lng, 'E', 'W')}`;
  },

  /**
   * Generate Printable Field Sheet HTML
   * @param {Array} points 
   * @returns {String} HTML for print
   */
  generatePrintableFieldSheet: function(points) {
    let rowsHtml = points.map((p, i) => `
      <tr>
        <td style="font-weight:bold; font-family:monospace; white-space:nowrap;">${p.code || 'PT-' + (i+1)}</td>
        <td>
          <b>${p.name}</b><br/>
          <small style="color:#555;">${p.unit || ''}</small>
        </td>
        <td style="font-family:monospace; white-space:nowrap; font-size:11px;">
          ${p.lat.toFixed(5)}°N, ${p.lng.toFixed(5)}°E<br/>
          <small style="color:#666;">${this.convertToDMS(p.lat, p.lng)}</small>
        </td>
        <td>${p.period || '1941/1944'}</td>
        <td style="white-space:nowrap;">${p.depthEstimate || '—'}</td>
        <td style="white-space:nowrap; font-weight:600;">${p.estimatedCasualties || '—'}</td>
        <td style="font-size:11px; line-height:1.3;">${p.recommendation || p.description ? (p.recommendation || p.description).substring(0, 140) + '...' : '—'}</td>
      </tr>
    `).join('');

    return `
      <div class="print-field-sheet">
        <div style="border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 12px; display:flex; justify-content:space-between; align-items:center;">
          <div>
            <h2 style="margin:0; font-size:18px; text-transform:uppercase;">Полевой планшет поисковой экспедиции</h2>
            <div style="font-size:12px; color:#444;">Гродненский район (1941, 1944 гг.) | Реестр GRO-Registry</div>
          </div>
          <div style="text-align:right; font-size:11px; font-family:monospace;">
            Дата выгрузки: ${new Date().toLocaleDateString('ru-RU')} ${new Date().toLocaleTimeString('ru-RU')}<br/>
            Всего объектов: ${points.length}
          </div>
        </div>

        <table style="width:100%; border-collapse:collapse; font-size:12px;" border="1" cellpadding="6">
          <thead>
            <tr style="background:#e0e0e0;">
              <th>Код</th>
              <th>Объект / Подразделение</th>
              <th>Координаты WGS84 (DD / DMS)</th>
              <th>Период</th>
              <th>Глубина</th>
              <th>Потери</th>
              <th>Рекомендации поисковой группе</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div style="margin-top: 14px; font-size: 10px; color: #666; border-top: 1px dashed #999; padding-top: 6px; text-align:center;">
          ГИС «ПОИСК-ГРОДНО 1941/1944» | База архивных данных ЦАМО РФ, NARA (США) и бланков военнопленных Stalag 324
        </div>
      </div>
    `;
  },

  escapeXML: function(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  },

  downloadFile: function(content, filename, contentType) {
    let blob = new Blob([content], { type: contentType });
    let url = URL.createObjectURL(blob);
    let a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  }
};


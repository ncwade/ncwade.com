// AWS Edge Locations - US CloudFront Points of Presence
import * as topojson from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";
import usAtlas from "us-atlas/nation-10m.json";

interface EdgeLocation {
  name: string;
  lat: number;
  lon: number;
}

// AWS CloudFront Edge Locations in the US
// These are the Points of Presence (PoPs) for content delivery
const edgeLocations: EdgeLocation[] = [
  // East Coast
  { name: "Ashburn, VA", lat: 39.04, lon: -77.49 },
  { name: "Atlanta, GA", lat: 33.75, lon: -84.39 },
  { name: "Boston, MA", lat: 42.36, lon: -71.06 },
  { name: "Jacksonville, FL", lat: 30.33, lon: -81.66 },
  { name: "Miami, FL", lat: 25.76, lon: -80.19 },
  { name: "New York, NY", lat: 40.71, lon: -74.01 },
  { name: "Newark, NJ", lat: 40.74, lon: -74.17 },
  { name: "Philadelphia, PA", lat: 39.95, lon: -75.17 },
  { name: "Tampa Bay, FL", lat: 27.95, lon: -82.46 },
  { name: "Washington D.C.", lat: 38.91, lon: -77.04 },

  // Central
  { name: "Chicago, IL", lat: 41.88, lon: -87.63 },
  { name: "Columbus, OH", lat: 39.96, lon: -83.00 },
  { name: "Dallas/Fort Worth, TX", lat: 32.78, lon: -96.80 },
  { name: "Denver, CO", lat: 39.74, lon: -104.99 },
  { name: "Houston, TX", lat: 29.76, lon: -95.37 },
  { name: "Kansas City, MO", lat: 39.10, lon: -94.58 },
  { name: "Minneapolis, MN", lat: 44.98, lon: -93.27 },
  { name: "Nashville, TN", lat: 36.16, lon: -86.78 },
  { name: "South Bend, IN", lat: 41.68, lon: -86.25 },
  { name: "St. Louis, MO", lat: 38.63, lon: -90.20 },

  // West Coast
  { name: "Hayward, CA", lat: 37.67, lon: -122.08 },
  { name: "Los Angeles, CA", lat: 34.05, lon: -118.24 },
  { name: "Palo Alto, CA", lat: 37.44, lon: -122.14 },
  { name: "Phoenix, AZ", lat: 33.45, lon: -112.07 },
  { name: "Portland, OR", lat: 45.52, lon: -122.68 },
  { name: "Salt Lake City, UT", lat: 40.76, lon: -111.89 },
  { name: "San Jose, CA", lat: 37.34, lon: -121.89 },
  { name: "Seattle, WA", lat: 47.61, lon: -122.33 },
];

// Green color scheme to match site theme
const colors = {
  main: "#00ff88",
  glow: "rgba(0, 255, 136, 0.5)",
  line: "rgba(0, 255, 136, 0.08)",
};

interface Point2D {
  x: number;
  y: number;
}

interface DataPacket {
  from: number;
  to: number;
  progress: number;
  speed: number;
}

// Type for the US Atlas topology
type USAtlasTopology = Topology<{
  nation: GeometryCollection;
}>;

class USMap {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number = 0;
  private height: number = 0;
  private mapWidth: number = 0;
  private mapHeight: number = 0;
  private offsetX: number = 0;
  private offsetY: number = 0;
  private dataPackets: DataPacket[] = [];
  private prefersReducedMotion: boolean = false;
  private pixelRatio: number = 1;
  private nationPath: Array<Array<[number, number]>> = [];
  private connections: Array<{ from: number; to: number }> = [];

  // US bounds for projection
  private readonly US_LAT_MIN = 24;
  private readonly US_LAT_MAX = 50;
  private readonly US_LON_MIN = -125;
  private readonly US_LON_MAX = -66;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext("2d", { alpha: true });
    if (!context) {
      throw new Error("Could not get 2D context");
    }
    this.ctx = context;

    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = "high";

    this.pixelRatio = window.devicePixelRatio || 1;

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    this.prefersReducedMotion = mediaQuery.matches;
    mediaQuery.addEventListener("change", (e) => {
      this.prefersReducedMotion = e.matches;
    });

    this.loadUSBorder();
    this.generateConnections();
    this.resize();
    this.initDataPackets();
    this.setupEventListeners();
    this.animate();
  }

  private loadUSBorder(): void {
    const topology = usAtlas as unknown as USAtlasTopology;
    const nationGeoJSON = topojson.feature(topology, topology.objects.nation);

    if ("features" in nationGeoJSON) {
      nationGeoJSON.features.forEach((feature) => {
        this.extractCoordinates(feature.geometry);
      });
    } else {
      this.extractCoordinates(nationGeoJSON.geometry);
    }
  }

  private extractCoordinates(geometry: GeoJSON.Geometry): void {
    if (geometry.type === "Polygon") {
      geometry.coordinates.forEach((ring) => {
        this.nationPath.push(ring as Array<[number, number]>);
      });
    } else if (geometry.type === "MultiPolygon") {
      geometry.coordinates.forEach((polygon) => {
        polygon.forEach((ring) => {
          this.nationPath.push(ring as Array<[number, number]>);
        });
      });
    }
  }

  private generateConnections(): void {
    // Connect all edge locations to form a network mesh
    for (let i = 0; i < edgeLocations.length; i++) {
      for (let j = i + 1; j < edgeLocations.length; j++) {
        this.connections.push({ from: i, to: j });
      }
    }
  }

  private resize(): void {
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    this.canvas.width = this.width * this.pixelRatio;
    this.canvas.height = this.height * this.pixelRatio;
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;

    this.ctx.scale(this.pixelRatio, this.pixelRatio);
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = "high";

    const usAspectRatio =
      (this.US_LON_MAX - this.US_LON_MIN) / (this.US_LAT_MAX - this.US_LAT_MIN);
    const screenAspectRatio = this.width / this.height;

    if (screenAspectRatio > usAspectRatio) {
      this.mapHeight = this.height * 0.8;
      this.mapWidth = this.mapHeight * usAspectRatio;
    } else {
      this.mapWidth = this.width * 0.9;
      this.mapHeight = this.mapWidth / usAspectRatio;
    }

    this.offsetX = (this.width - this.mapWidth) / 2;
    this.offsetY = (this.height - this.mapHeight) / 2;
  }

  private setupEventListeners(): void {
    window.addEventListener("resize", () => this.resize());
  }

  private initDataPackets(): void {
    const numPackets = window.innerWidth < 768 ? 15 : 25;
    for (let i = 0; i < numPackets; i++) {
      this.dataPackets.push({
        from: Math.floor(Math.random() * edgeLocations.length),
        to: Math.floor(Math.random() * edgeLocations.length),
        progress: Math.random(),
        speed: 0.002 + Math.random() * 0.003,
      });
    }
  }

  private latLonToXY(lat: number, lon: number): Point2D {
    const x =
      this.offsetX +
      ((lon - this.US_LON_MIN) / (this.US_LON_MAX - this.US_LON_MIN)) *
        this.mapWidth;
    const y =
      this.offsetY +
      ((this.US_LAT_MAX - lat) / (this.US_LAT_MAX - this.US_LAT_MIN)) *
        this.mapHeight;
    return { x, y };
  }

  private drawWireframeGrid(): void {
    const { ctx } = this;

    ctx.strokeStyle = "rgba(0, 255, 136, 0.06)";
    ctx.lineWidth = 1;

    for (let lat = 25; lat <= 50; lat += 5) {
      const start = this.latLonToXY(lat, this.US_LON_MIN);
      const end = this.latLonToXY(lat, this.US_LON_MAX);

      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
    }

    for (let lon = -120; lon <= -70; lon += 10) {
      const start = this.latLonToXY(this.US_LAT_MAX, lon);
      const end = this.latLonToXY(this.US_LAT_MIN, lon);

      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
    }
  }

  private drawUSBorder(): void {
    const { ctx } = this;

    ctx.strokeStyle = "rgba(0, 255, 136, 0.3)";
    ctx.lineWidth = 1.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    this.nationPath.forEach((ring) => {
      if (ring.length === 0) return;

      ctx.beginPath();

      const firstPoint = this.latLonToXY(ring[0][1], ring[0][0]);
      ctx.moveTo(firstPoint.x, firstPoint.y);

      for (let i = 1; i < ring.length; i++) {
        const point = this.latLonToXY(ring[i][1], ring[i][0]);
        ctx.lineTo(point.x, point.y);
      }

      ctx.closePath();
      ctx.stroke();
    });
  }

  private drawEdgeLocations(): void {
    const { ctx } = this;
    const time = Date.now() * 0.001;

    edgeLocations.forEach((loc, index) => {
      const point = this.latLonToXY(loc.lat, loc.lon);

      // Pulsing effect
      const pulse = Math.sin(time * 2 + index * 0.3) * 0.5 + 0.5;
      const size = 3 + pulse * 2;

      // Glow
      ctx.beginPath();
      ctx.arc(point.x, point.y, size * 2.5, 0, Math.PI * 2);
      const gradient = ctx.createRadialGradient(
        point.x,
        point.y,
        0,
        point.x,
        point.y,
        size * 2.5
      );
      gradient.addColorStop(0, colors.glow);
      gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = gradient;
      ctx.fill();

      // Center dot
      ctx.beginPath();
      ctx.arc(point.x, point.y, size, 0, Math.PI * 2);
      ctx.fillStyle = colors.main;
      ctx.fill();
    });
  }

  private drawDataPackets(): void {
    const { ctx } = this;

    this.dataPackets.forEach((packet) => {
      if (!this.prefersReducedMotion) {
        packet.progress += packet.speed;
        if (packet.progress >= 1) {
          packet.progress = 0;
          packet.from = Math.floor(Math.random() * edgeLocations.length);
          packet.to = Math.floor(Math.random() * edgeLocations.length);
        }
      }

      const from = edgeLocations[packet.from];
      const to = edgeLocations[packet.to];

      const fromPoint = this.latLonToXY(from.lat, from.lon);
      const toPoint = this.latLonToXY(to.lat, to.lon);

      const t = packet.progress;

      const controlX = (fromPoint.x + toPoint.x) / 2;
      const controlY = Math.min(fromPoint.y, toPoint.y) - 50;

      const x =
        (1 - t) * (1 - t) * fromPoint.x +
        2 * (1 - t) * t * controlX +
        t * t * toPoint.x;
      const y =
        (1 - t) * (1 - t) * fromPoint.y +
        2 * (1 - t) * t * controlY +
        t * t * toPoint.y;

      // Draw packet
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, Math.PI * 2);
      ctx.fillStyle = colors.main;
      ctx.fill();

      // Trail effect
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, 5);
      gradient.addColorStop(0, colors.glow);
      gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = gradient;
      ctx.fill();
    });
  }

  private drawConnectionLines(): void {
    const { ctx } = this;

    ctx.strokeStyle = colors.line;
    ctx.lineWidth = 1;

    this.connections.forEach(({ from, to }) => {
      const fromLoc = edgeLocations[from];
      const toLoc = edgeLocations[to];

      const fromPoint = this.latLonToXY(fromLoc.lat, fromLoc.lon);
      const toPoint = this.latLonToXY(toLoc.lat, toLoc.lon);

      ctx.beginPath();
      ctx.moveTo(fromPoint.x, fromPoint.y);
      ctx.lineTo(toPoint.x, toPoint.y);
      ctx.stroke();
    });
  }

  private animate = (): void => {
    this.ctx.clearRect(0, 0, this.width, this.height);

    this.drawWireframeGrid();
    this.drawUSBorder();
    this.drawConnectionLines();
    this.drawEdgeLocations();
    this.drawDataPackets();

    requestAnimationFrame(this.animate);
  };
}

// Initialize when DOM is ready
if (typeof window !== "undefined") {
  const initMap = () => {
    const canvas = document.getElementById("globe-canvas") as HTMLCanvasElement;
    if (canvas) {
      new USMap(canvas);
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initMap);
  } else {
    initMap();
  }
}

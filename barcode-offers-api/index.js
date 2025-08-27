import express from "express";
import cors from "cors";
import haversine from "haversine-distance";
import { chromium } from "playwright";

const app = express();
app.use(cors());

function haversineKm(lat1, lon1, lat2, lon2) {
  const a = { latitude: lat1, longitude: lon1 };
  const b = { latitude: lat2, longitude: lon2 };
  return haversine(a, b) / 1000;
}

const stores = [
  {
    id: "sobeys_001",
    name: "Sobeys",
    lat: 43.73979207435915,
    lng: -79.74402764172683,
    address: "930 N Park Dr, Brampton, ON L6S 3Y5",
  },
  {
    id: "sobeys_011",
    name: "Sobeys",
    lat: 43.718125007969036,
    lng: -79.3408815035026,
    address: "1015 Broadview Ave, East York, ON M4K 2S2",
  },
  {
    id: "nofrills_002",
    name: "No Frills",
    lat: 43.766326927070416,
    lng: -79.52222818826648,
    address: "1 York Gate Blvd, North York, ON M3N 3A1",
  },
  {
    id: "nofrills_012",
    name: "No Frills",
    lat: 43.86432553089157,
    lng: -79.39809967076044,
    address: "9325 Yonge St, Richmond Hill, ON L4C 0A8",
  },
  {
    id: "wm_003",
    name: "Walmart",
    lat: 43.859911870820305,
    lng: -79.55498059492022,
    address: "3600 Major MacKenzie Dr W, Vaughan, ON L4H 3T6",
  },
  {
    id: "wm_013",
    name: "Walmart",
    lat: 43.73880153829885,
    lng: -79.2943682488171,
    address: "1900 Eglinton Ave E, Scarborough, ON M1L 2L9",
  },
];

const fakePrices = {
  "064420000774": [
    {
      storeId: "wm_003",
      title: "Sealtest 2% Milk 4L",
      price: 6.25,
      currency: "CAD",
      inStock: true,
    },
    {
      storeId: "wm_013",
      title: "Sealtest 2% Milk 4L",
      price: 6.25,
      currency: "CAD",
      inStock: true,
    },
    {
      storeId: "sobeys_001",
      title: "Sealtest 2% Milk 4L",
      price: 6.25,
      currency: "CAD",
      inStock: true,
    },
    {
      storeId: "sobeys_011",
      title: "Sealtest 2% Milk 4L",
      price: 6.25,
      currency: "CAD",
      inStock: true,
    },
    {
      storeId: "nofrills_002",
      title: "Sealtest 2% Milk 4L",
      price: 6.25,
      currency: "CAD",
      inStock: true,
    },
    {
      storeId: "nofrills_012",
      title: "Sealtest 2% Milk 4L",
      price: 6.25,
      currency: "CAD",
      inStock: true,
    },
  ],
  "079298000054": [
    {
      storeId: "sobeys_001",
      title: "Evian Water",
      price: 3.69,
      currency: "CAD",
      inStock: true,
    },
    {
      storeId: "sobeys_011",
      title: "Evian Water",
      price: 3.69,
      currency: "CAD",
      inStock: true,
    },
    {
      storeId: "nofrills_002",
      title: "Evian Water",
      price: 2.79,
      currency: "CAD",
      inStock: true,
    },
    {
      storeId: "nofrills_012",
      title: "Evian Water",
      price: 2.79,
      currency: "CAD",
      inStock: true,
    },
    {
      storeId: "wm_003",
      title: "Evian Water",
      price: 3.28,
      currency: "CAD",
      inStock: true,
    },
    {
      storeId: "wm_013",
      title: "Evian Water",
      price: 3.28,
      currency: "CAD",
      inStock: true,
    },
  ],
  "063400111653": [
    {
      storeId: "nofrills_002",
      title: "Wonder Bread Whole Wheat",
      price: 2.0,
      currency: "CAD",
      inStock: true,
    },
    {
      storeId: "nofrills_012",
      title: "Wonder Bread Whole Wheat",
      price: 2.0,
      currency: "CAD",
      inStock: true,
    },
    {
      storeId: "wm_003",
      title: "Wonder Bread Whole Wheat",
      price: 3.27,
      currency: "CAD",
      inStock: true,
    },
    {
      storeId: "wm_013",
      title: "Wonder Bread Whole Wheat",
      price: 3.27,
      currency: "CAD",
      inStock: true,
    },
  ],
  "681131911955" : [
    {
      storeId: "sobeys_001",
      title: "12 Eggs",
      price: 3.93,
      currency: "CAD",
      inStock: true,
    },
    {
      storeId: "sobeys_011",
      title: "12 Eggs",
      price: 3.93,
      currency: "CAD",
      inStock: true,
    },
    {
      storeId: "nofrills_002",
      title: "12 Eggs",
      price: 3.93,
      currency: "CAD",
      inStock: true,
    },
    {
      storeId: "nofrills_012",
      title: "12 Eggs",
      price: 3.93,
      currency: "CAD",
      inStock: true,
    },
    {
      storeId: "wm_003",
      title: "12 Eggs",
      price: 3.93,
      currency: "CAD",
      inStock: true,
    },
    {
      storeId: "wm_013",
      title: "12 Eggs",
      price: 3.93,
      currency: "CAD",
      inStock: true,
    },
  ],
};

app.get("/search-offers", (req, res) => {
  const { code, lat, lng } = req.query;
  console.log("Received request for code:", code, "at lat:", lat, "lng:", lng);
  const catalog = fakePrices[code] ?? [];
  const latN = Number(lat),
    lngN = Number(lng);

  const offers = catalog
    .map((item) => {
      const s = stores.find((st) => st.id === item.storeId);
      if (!s) return null;
      return {
        storeId: s.id,
        storeName: s.name,
        address: s.address,
        price: item.price,
        distanceKm: haversineKm(latN, lngN, s.lat, s.lng),
        productTitle: item.title,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.price - b.price);
  res.json(offers);
});

app.listen(4000, () => {
  console.log("Barcode Offers API running on http://localhost:4000");
});

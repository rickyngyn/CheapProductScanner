import { CameraView, CameraType, useCameraPermissions } from "expo-camera";
import { useState, useRef, useEffect } from "react";
import {
  Button,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
  Linking,
} from "react-native";
import * as Location from "expo-location";
import Constants from "expo-constants";

const BASE_URL = Constants.expoConfig?.extra?.BASE_URL;

type Product = {
  code: string;
  name: string;
  brands: string;
};

type Offer = {
  storeId: string;
  storeName: string;
  price: number;
  address: string;
  distanceKm: number;
  productTitle: string;
};

export default function App() {
  const [facing, setFacing] = useState<CameraType>("back");
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const scanLock = useRef(false);
  const [location, setLocation] = useState<Location.LocationObject | null>(
    null
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [offers, setOffers] = useState<Offer[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [postalCode, setPostalCode] = useState<string | null>(null);

  useEffect(() => {
    async function getCurrentLocation() {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setErrorMsg("Permission to access location was denied");
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      setLocation(location);

      let addresses = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      setPostalCode(addresses[0]?.postalCode);
    }

    getCurrentLocation();
  }, []);

  if (!permission) {
    return <View />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>
          We need your permission to show the camera
        </Text>
        <Button onPress={requestPermission} title="Grant Permission" />
      </View>
    );
  }

  function toggleCameraFacing() {
    setFacing((current) => (current === "back" ? "front" : "back"));
  }

  async function fetchProduct(barcode: string) {
    try {
      const response = await fetch(
        `https://world.openfoodfacts.net/api/v2/product/${barcode}`
      );
      if (!response.ok) {
        throw new Error("Product not found");
      }
      const data = await response.json();
      const product = data.product;
      const p: Product = {
        code: barcode,
        name: product.product_name || "No Product Name Found",
        brands: product.brands || "No Brand Found",
      };
      setProduct(p);

      if (!location) throw new Error("Location unavailable");
      setLoading(true);
      const response2 = await fetch(
        `${BASE_URL}/search-offers?code=${encodeURIComponent(p.code)}&lat=${
          location.coords.latitude
        }&lng=${location.coords.longitude}`
      );
      const result = await response2.json();
      if (!response2.ok) {
        throw new Error(result.error || "Failed to fetch offers");
      }
      setOffers(result);
    } catch (error) {
      Alert.alert("Error", (error as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function handleBarcodeScanned({
    type,
    data,
  }: {
    type: string;
    data: string;
  }) {
    if (scanLock.current) return;

    scanLock.current = true;
    setScanned(true);
    fetchProduct(data);
    Alert.alert(`Scanned ${type}`, `Data: ${data}`);
    setTimeout(() => {
      scanLock.current = false;
      setScanned(false);
    }, 10000);
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        facing={facing}
        barcodeScannerSettings={{
          barcodeTypes: [
            "ean13",
            "ean8",
            "upc_a",
            "upc_e",
            "code39",
            "code128",
          ],
        }}
        onBarcodeScanned={handleBarcodeScanned}
      >
        {loading && (
          <View style={styles.loadingText}>
            <Text style={{ color: "white", fontSize: 18 }}>
              Looking for nearby prices...
            </Text>
          </View>
        )}

        {product && (offers?.length ?? 0) === 0 && (
          <View style={styles.offersContainer}>
            <Text style={{ fontSize: 16, fontWeight: "bold" }}>
              {product.name}
            </Text>
            <Text style={{ marginBottom: 5 }}>{product.brands ?? ""}</Text>
            <Text style={{ marginBottom: 15 }}>No nearby prices found</Text>
          </View>
        )}

        {product && offers && (
          <View style={styles.offersContainer}>
            <Text style={{ fontSize: 16, fontWeight: "bold" }}>
              {product.name}
            </Text>
            <Text style={{ marginBottom: 8 }}>{product.brands ?? ""}</Text>
            {offers.slice(0, 5).map((o) => (
              <TouchableOpacity
                key={o.storeId}
                style={{
                  paddingVertical: 8,
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  borderColor: "#ddd",
                }}
                onPress={() => {
                  const q = encodeURIComponent(`${o.storeName} ${o.address}`);
                  Linking.openURL(`http://maps.apple.com/?q=${q}`);
                }}
              >
                <Text style={{ fontWeight: "600" }}>
                  {o.storeName} | ${o.price} CAD | {(o.distanceKm).toFixed(1)} km
                </Text>
                <Text>{o.productTitle}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.button} onPress={toggleCameraFacing}>
            <Text style={styles.text}>Flip Camera</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.scanArea} />
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  scanArea: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: "white",
    borderRadius: 10,
    alignSelf: "center",
    marginTop: 0,
  },
  container: {
    flex: 1,
    justifyContent: "center",
  },
  message: {
    textAlign: "center",
    paddingBottom: 10,
  },
  camera: {
    flex: 1,
  },
  buttonContainer: {
    margin: 20,
    marginTop: 50,
    flexDirection: "row",
    backgroundColor: "transparent",
  },
  button: {
    flex: 1,
    alignSelf: "flex-end",
    alignItems: "center",
  },
  text: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
  },
  loadingText: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  offersContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "white",
    padding: 12,
    maxHeight: 280,
  },
});

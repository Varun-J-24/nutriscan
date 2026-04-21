import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { createApiClient } from '../services/apiClient.js';
import { useBarcodeScanner } from '../hooks/useBarcodeScanner.js';
import { detectExpiryFromVideo } from '../services/ocrService.js';

const LOGO_SRC = '/nutriscan-logo.jpg';

const badgeClass = {
  Expired: 'bg-red-100 text-red-700 border-red-200',
  'Expiring Soon': 'bg-yellow-100 text-yellow-700 border-yellow-200',
  Safe: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  Unknown: 'bg-slate-100 text-slate-700 border-slate-200'
};

const severityClass = {
  red: 'bg-red-100 text-red-700 border-red-200',
  yellow: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  green: 'bg-emerald-100 text-emerald-700 border-emerald-200'
};

const navItems = ['Home', 'Scan History', 'Favorites', 'Alerts', 'Settings'];

const statusToProgress = {
  Safe: 15,
  'Expiring Soon': 55,
  Expired: 92,
  Unknown: 35
};

const formatScanTime = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  return date.toLocaleString();
};

const shortAgo = (value) => {
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return '--';
  const diffMin = Math.max(1, Math.round((Date.now() - time) / 60000));
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHours = Math.round(diffMin / 60);
  if (diffHours < 24) return `${diffHours} hr ago`;
  return `${Math.round(diffHours / 24)} day ago`;
};

const scoreTone = (score) => {
  if (score >= 80) return 'text-emerald-600 bg-emerald-50 border-emerald-100';
  if (score >= 60) return 'text-yellow-700 bg-yellow-50 border-yellow-100';
  return 'text-red-600 bg-red-50 border-red-100';
};

export default function DashboardPage() {
  const videoRef = useRef(null);
  const homeRef = useRef(null);
  const recentRef = useRef(null);
  const scannerRef = useRef(null);
  const expiryRef = useRef(null);
  const historyRef = useRef(null);
  const settingsRef = useRef(null);
  const { user, logout, getIdToken } = useAuth();

  const api = useMemo(() => createApiClient(getIdToken), [getIdToken]);

  const [scannerActive, setScannerActive] = useState(false);
  const [barcode, setBarcode] = useState('');
  const [product, setProduct] = useState(null);
  const [productError, setProductError] = useState('');
  const [productLoading, setProductLoading] = useState(false);

  const [analysis, setAnalysis] = useState(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);

  const [expiry, setExpiry] = useState({ status: 'Unknown', expiryDate: null, daysRemaining: null });
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrError, setOcrError] = useState('');

  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [activeNav, setActiveNav] = useState('Home');
  const [historyView, setHistoryView] = useState('all');
  const [favorites, setFavorites] = useState(() => {
    if (typeof window === 'undefined') return [];
    try {
      const parsed = JSON.parse(localStorage.getItem('nutriscan_favorites') || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  const fetchProduct = useCallback(
    async (code) => {
      setBarcode(code);
      setProductLoading(true);
      setProductError('');
      setAnalysis(null);
      setExpiry({ status: 'Unknown', expiryDate: null, daysRemaining: null });
      setOcrError('');

      try {
        const response = await api.getProductByBarcode(code);
        setProduct(response.product);
      } catch (error) {
        setProduct(null);
        setProductError(error.message || 'Unable to fetch product.');
      } finally {
        setProductLoading(false);
      }
    },
    [api]
  );

  const { scannerError, clearScannerError, scanImageFile, cameraSupported } = useBarcodeScanner({
    videoRef,
    active: scannerActive,
    onDetected: fetchProduct
  });

  useEffect(() => {
    localStorage.setItem('nutriscan_favorites', JSON.stringify(favorites));
  }, [favorites]);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const response = await api.getHistory();
      setHistory(response.items || []);
    } catch (error) {
      console.error(error);
    } finally {
      setHistoryLoading(false);
    }
  }, [api]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const runOcr = async () => {
    if (!scannerActive || !videoRef.current) {
      setOcrError('Start scanner first to capture expiry date.');
      return;
    }

    setOcrLoading(true);
    setOcrError('');

    try {
      const response = await detectExpiryFromVideo(videoRef.current);
      setExpiry(response);
    } catch (error) {
      setOcrError(error.message || 'OCR failed.');
    } finally {
      setOcrLoading(false);
    }
  };

  const runAnalysis = async () => {
    if (!product) {
      return;
    }

    setAnalysisLoading(true);

    try {
      const response = await api.analyzeProduct({
        product,
        expiryStatus: expiry.status
      });

      setAnalysis(response.analysis);

      await api.addHistory({
        barcode: product.barcode,
        productName: product.productName,
        healthScore: response.analysis.healthScore,
        expiryStatus: expiry.status,
        scannedAt: new Date().toISOString(),
        warnings: response.analysis.warnings || []
      });

      await loadHistory();
    } catch (error) {
      setProductError(error.message || 'Analysis failed.');
    } finally {
      setAnalysisLoading(false);
    }
  };

  const favoriteSet = useMemo(() => new Set(favorites), [favorites]);
  const filteredHistory = useMemo(() => {
    if (historyView !== 'favorites') return history;
    return history.filter((item) => item.barcode && favoriteSet.has(item.barcode));
  }, [history, historyView, favoriteSet]);
  const recentCards = filteredHistory.slice(0, 4);
  const insightItems = analysis?.highlightedIngredients || [];

  const toggleFavorite = (barcodeValue) => {
    if (!barcodeValue) return;
    setFavorites((prev) =>
      prev.includes(barcodeValue)
        ? prev.filter((item) => item !== barcodeValue)
        : [...prev, barcodeValue]
    );
  };

  const scrollTo = (ref) => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleNavClick = (item) => {
    setActiveNav(item);

    if (item === 'Home') {
      setHistoryView('all');
      scrollTo(homeRef);
      return;
    }

    if (item === 'Scan History') {
      setHistoryView('all');
      scrollTo(historyRef);
      return;
    }

    if (item === 'Favorites') {
      setHistoryView('favorites');
      scrollTo(historyRef);
      return;
    }

    if (item === 'Alerts') {
      scrollTo(expiryRef);
      return;
    }

    scrollTo(settingsRef);
  };

  const handleImageBarcodeUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      await scanImageFile(file);
    } catch {
      // Scanner error state is handled inside hook.
    } finally {
      event.target.value = '';
    }
  };

  const resetScannerState = () => {
    clearScannerError();
    setScannerActive(false);
    setBarcode('');
    setProduct(null);
    setAnalysis(null);
    setExpiry({ status: 'Unknown', expiryDate: null, daysRemaining: null });
    setOcrError('');
    setProductError('');
  };

  const riskSummary = insightItems.reduce(
    (acc, item) => {
      if (item.severity === 'high') acc.high += 1;
      else if (item.severity === 'medium') acc.moderate += 1;
      else acc.safe += 1;
      return acc;
    },
    { safe: 0, moderate: 0, high: 0 }
  );

  const riskTotal = Math.max(1, riskSummary.safe + riskSummary.moderate + riskSummary.high);
  const safeDeg = (riskSummary.safe / riskTotal) * 360;
  const moderateDeg = (riskSummary.moderate / riskTotal) * 360;
  const chartStyle = {
    background: `conic-gradient(#22c55e 0deg ${safeDeg}deg, #facc15 ${safeDeg}deg ${safeDeg + moderateDeg}deg, #ef4444 ${safeDeg + moderateDeg}deg 360deg)`
  };

  return (
    <div className="min-h-screen p-3 md:p-6">
      <div className="mx-auto grid max-w-[1400px] gap-4 lg:grid-cols-[230px,1fr]">
        <aside className="soft-card rounded-2xl p-4 md:p-5">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4">
            <img
              src={LOGO_SRC}
              alt="NutriScan logo"
              className="h-10 w-10 rounded-xl border border-emerald-100 object-cover"
            />
            <div>
              <p className="text-lg font-semibold text-slate-900">
                Nutri<span className="text-emerald-600">Scan</span>
              </p>
              <p className="text-xs text-slate-500">Smart nutrition companion</p>
            </div>
          </div>

          <nav className="mt-4 grid gap-1.5">
            {navItems.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => handleNavClick(item)}
                className={`rounded-lg px-3 py-2 text-left text-sm transition ${
                  activeNav === item
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                {item}
              </button>
            ))}
          </nav>

          <button
            type="button"
            onClick={logout}
            className="mt-5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Logout
          </button>
        </aside>

        <main className="space-y-4">
          <header ref={homeRef} className="soft-card rounded-2xl p-4 md:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-2xl font-semibold text-slate-900">
                  Hello, {user.displayName?.split(' ')[0] || 'User'}! 👋
                </p>
                <p className="text-sm text-slate-500">
                  Scan products to get ingredient insights, nutrition analysis, and expiry safety checks.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleNavClick('Alerts')}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600"
                >
                  🔔
                </button>
                <img
                  src={user.photoURL || 'https://api.dicebear.com/9.x/initials/svg?seed=NutriScan'}
                  alt="Profile"
                  className="h-10 w-10 rounded-full border border-slate-200 object-cover"
                />
              </div>
            </div>
          </header>

          <section ref={settingsRef} className="soft-card rounded-2xl p-4 md:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Settings & Controls</h3>
                <p className="text-sm text-slate-500">
                  Camera support: {cameraSupported ? 'Available' : 'Unavailable in this browser context'}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={resetScannerState}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Reset Scanner State
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryView('all')}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Show All Scans
                </button>
              </div>
            </div>
          </section>

          <section className="soft-card rounded-2xl p-4 md:p-5">
            <div className="grid gap-4 md:grid-cols-[1.3fr,0.9fr] md:items-center">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Scan a Product</p>
                <h2 className="mt-2 text-xl font-semibold text-slate-900">Use your camera to scan barcode and capture product details</h2>
                <p className="mt-2 text-sm text-slate-500">Barcode: <span className="font-medium text-slate-700">{barcode || 'Waiting for scan'}</span></p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      clearScannerError();
                      setScannerActive((prev) => !prev);
                    }}
                    disabled={!cameraSupported}
                    className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
                  >
                    {scannerActive ? 'Stop Scanning' : 'Start Scanning'}
                  </button>
                  <button
                    type="button"
                    onClick={runOcr}
                    disabled={!scannerActive || ocrLoading}
                    className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                  >
                    {ocrLoading ? 'Reading...' : 'Detect Expiry'}
                  </button>
                  <label className="cursor-pointer rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                    Upload Barcode Image
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={handleImageBarcodeUpload}
                    />
                  </label>
                </div>
                {!cameraSupported ? (
                  <p className="mt-2 text-xs text-amber-700">
                    Camera access is unavailable in this browser context. Use localhost/HTTPS or upload a barcode image.
                  </p>
                ) : null}
              </div>

              <div className="relative overflow-hidden rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-lime-50 p-4">
                {product?.imageUrl ? (
                  <img src={product.imageUrl} alt="Product" className="h-36 w-full rounded-xl object-contain" />
                ) : (
                  <div className="flex h-36 items-center justify-center rounded-xl border border-dashed border-emerald-200 bg-white/70 text-sm text-slate-500">
                    Product preview appears here
                  </div>
                )}
                <span className={`absolute left-3 top-3 rounded-full border px-2 py-1 text-xs font-medium ${badgeClass[expiry.status]}`}>
                  {expiry.status}
                </span>
              </div>
            </div>

            {scannerError || ocrError || productError ? (
              <p className="mt-3 text-sm text-red-600">{scannerError || ocrError || productError}</p>
            ) : null}
          </section>

          <section ref={recentRef} className="soft-card rounded-2xl p-4 md:p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Recent Scans</h3>
              <button
                type="button"
                onClick={() => handleNavClick('Scan History')}
                className="text-xs text-emerald-600"
              >
                View all
              </button>
            </div>

            {historyLoading ? <p className="text-sm text-slate-500">Loading recent scans...</p> : null}

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {recentCards.map((item) => (
                <article key={`${item.scannedAt}-${item.productName}`} className="rounded-xl border border-slate-200 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="line-clamp-1 text-sm font-semibold text-slate-800">{item.productName}</p>
                    <button
                      type="button"
                      onClick={() => toggleFavorite(item.barcode)}
                      className="text-xs"
                      title="Toggle favorite"
                    >
                      {item.barcode && favoriteSet.has(item.barcode) ? '★' : '☆'}
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{shortAgo(item.scannedAt)}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className={`rounded-md border px-2 py-0.5 text-xs font-medium ${scoreTone(item.healthScore)}`}>
                      {item.healthScore}
                    </span>
                    <span className={`rounded-md border px-2 py-0.5 text-xs font-medium ${badgeClass[item.expiryStatus]}`}>
                      {item.expiryStatus}
                    </span>
                  </div>
                </article>
              ))}

              {!historyLoading && recentCards.length === 0 ? (
                <p className="text-sm text-slate-500">
                  {historyView === 'favorites'
                    ? 'No favorite scans yet. Mark products with ★ to see them here.'
                    : 'No scans yet. Start by scanning your first product.'}
                </p>
              ) : null}
            </div>
          </section>

          <div ref={scannerRef} className="grid gap-4 xl:grid-cols-[1fr,1.1fr]">
            <section className="soft-card rounded-2xl p-4 md:p-5">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900">Scanner (Camera View)</h3>
                <span className="text-xs text-slate-500">Align barcode within frame</span>
              </div>

              <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-950">
                <video ref={videoRef} autoPlay playsInline muted className="h-[280px] w-full object-cover" />
                <div className="pointer-events-none absolute left-6 right-6 top-1/2 h-0.5 -translate-y-1/2 bg-emerald-400 shadow-[0_0_22px_#34d399]" />
              </div>
            </section>

            <section className="soft-card rounded-2xl p-4 md:p-5">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900">Product Details & AI Analysis</h3>
                <button
                  type="button"
                  disabled={!product || analysisLoading || productLoading}
                  onClick={runAnalysis}
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-60"
                >
                  {analysisLoading ? 'Analyzing...' : 'Run Analysis'}
                </button>
              </div>

              {productLoading ? <p className="text-sm text-slate-500">Fetching product details...</p> : null}

              {product ? (
                <>
                  <div className="flex items-start gap-3 rounded-xl border border-slate-200 p-3">
                    <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl bg-slate-50">
                      {product.imageUrl ? (
                        <img src={product.imageUrl} alt={product.productName} className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-2xl">📦</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-lg font-semibold text-slate-900">{product.productName}</p>
                      <p className="text-xs text-slate-500">Brand: {product.brands || 'Unknown'} · Barcode: {product.barcode}</p>
                      <p className="mt-1 text-xs text-slate-500">Category: Grocery · Qty: 100g</p>
                      <button
                        type="button"
                        onClick={() => toggleFavorite(product.barcode)}
                        className="mt-2 rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
                      >
                        {product.barcode && favoriteSet.has(product.barcode) ? 'Remove Favorite ★' : 'Add Favorite ☆'}
                      </button>
                    </div>
                    <div className={`rounded-xl border px-3 py-2 text-center ${scoreTone(analysis?.healthScore ?? 0)}`}>
                      <p className="text-2xl font-semibold leading-none">{analysis?.healthScore ?? '--'}</p>
                      <p className="text-[10px] uppercase tracking-wider">health score</p>
                    </div>
                  </div>

                  <div className="mt-3 rounded-xl border border-slate-200 p-3">
                    <p className="text-sm font-semibold text-slate-800">AI Summary</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {analysis?.simplifiedExplanation || 'Run AI analysis to see easy-to-read health insights and warnings.'}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {(analysis?.highlightedIngredients || []).slice(0, 5).map((item) => (
                        <span
                          key={`${item.label}-${item.severity}`}
                          className={`rounded-full border px-3 py-1 text-xs font-medium ${severityClass[item.color] || 'bg-slate-100 text-slate-600 border-slate-200'}`}
                        >
                          {item.label}
                        </span>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-sm text-slate-500">No product scanned yet.</p>
              )}
            </section>
          </div>

          <div ref={expiryRef} className="grid gap-4 xl:grid-cols-[1.2fr,0.8fr]">
            <section className="soft-card rounded-2xl p-4 md:p-5">
              <h3 className="text-lg font-semibold text-slate-900">Ingredients & Health Insights</h3>

              <div className="mt-3 rounded-xl border border-slate-200 p-3">
                <p className="text-sm font-semibold text-slate-800">Ingredients</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  {product?.ingredients || 'Scan a product to display ingredients.'}
                </p>
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <article className="rounded-xl border border-slate-200 p-3">
                  <p className="text-sm font-semibold text-slate-800">Health Insights</p>
                  <div className="mt-2 space-y-1.5 text-sm text-slate-600">
                    <p>Sugar: {(product?.nutritionalValues?.sugars ?? 'N/A')}g</p>
                    <p>Sodium: {(product?.nutritionalValues?.sodium ?? 'N/A')}g</p>
                    <p>Protein: {(product?.nutritionalValues?.proteins ?? 'N/A')}g</p>
                    <p>Expiry Status: {expiry.status}</p>
                  </div>
                </article>

                <article className="rounded-xl border border-slate-200 p-3">
                  <p className="text-sm font-semibold text-slate-800">Suitability</p>
                  <div className="mt-2 space-y-1.5 text-sm text-slate-600">
                    <p>Diabetic: {analysis?.suitability?.diabetic || 'Pending analysis'}</p>
                    <p>Fitness: {analysis?.suitability?.fitness || 'Pending analysis'}</p>
                    <p>General: {analysis?.suitability?.general || 'Pending analysis'}</p>
                  </div>
                </article>
              </div>
            </section>

            <section className="soft-card rounded-2xl p-4 md:p-5">
              <h3 className="text-lg font-semibold text-slate-900">Ingredient Safety Breakdown</h3>

              <div className="mt-4 flex items-center gap-4">
                <div className="relative h-28 w-28 rounded-full" style={chartStyle}>
                  <div className="absolute inset-3 rounded-full bg-white" />
                </div>

                <div className="space-y-2 text-sm">
                  <p className="flex items-center gap-2 text-slate-600"><span className="h-2 w-2 rounded-full bg-emerald-500" />Safe ({riskSummary.safe})</p>
                  <p className="flex items-center gap-2 text-slate-600"><span className="h-2 w-2 rounded-full bg-yellow-400" />Moderate ({riskSummary.moderate})</p>
                  <p className="flex items-center gap-2 text-slate-600"><span className="h-2 w-2 rounded-full bg-red-500" />High Risk ({riskSummary.high})</p>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-slate-200 p-3">
                <p className="text-sm text-slate-600">Health Score</p>
                <p className="text-3xl font-semibold text-slate-900">{analysis?.healthScore ?? '--'} <span className="text-sm text-slate-500">/100</span></p>
                <p className="mt-1 text-xs text-slate-500">{analysis ? 'AI generated score based on ingredients and nutrition profile.' : 'Score appears after analysis.'}</p>
              </div>
            </section>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <section className="soft-card rounded-2xl p-4 md:p-5">
              <h3 className="text-lg font-semibold text-slate-900">Expiry Detection & Alerts</h3>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <article className="rounded-xl border border-slate-200 p-3">
                  <p className="text-xs uppercase tracking-wider text-slate-500">Expiry Information</p>
                  <p className="mt-2 text-sm text-slate-700">Date: {expiry.expiryDate || product?.expiryInfo || 'Not detected'}</p>
                  <p className="mt-1 text-sm text-slate-700">Status: <span className={`rounded-md border px-2 py-0.5 text-xs ${badgeClass[expiry.status]}`}>{expiry.status}</span></p>
                  <p className="mt-1 text-sm text-slate-700">Days Left: {expiry.daysRemaining ?? 'Unknown'}</p>
                </article>

                <article className="rounded-xl border border-slate-200 p-3">
                  <p className="text-xs uppercase tracking-wider text-slate-500">Expiry Timeline</p>
                  <div className="relative mt-6 h-1 rounded-full bg-gradient-to-r from-emerald-400 via-yellow-400 to-red-500">
                    <span
                      className="absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border-2 border-white bg-slate-900"
                      style={{ left: `${statusToProgress[expiry.status]}%` }}
                    />
                  </div>
                  <div className="mt-2 flex justify-between text-xs text-slate-500">
                    <span>Safe</span>
                    <span>Expiring Soon</span>
                    <span>Expired</span>
                  </div>
                </article>
              </div>
            </section>

            <section ref={historyRef} className="soft-card rounded-2xl p-4 md:p-5">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900">Scan History</h3>
                <span className="text-xs text-slate-500">
                  {historyView === 'favorites' ? 'Favorites only' : 'Per-user records'}
                </span>
              </div>

              <div className="overflow-auto rounded-xl border border-slate-200">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-3 py-2">Product</th>
                      <th className="px-3 py-2">Date</th>
                      <th className="px-3 py-2">Score</th>
                      <th className="px-3 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredHistory.map((item) => (
                      <tr key={`${item.scannedAt}-${item.productName}`} className="border-t border-slate-100">
                        <td className="px-3 py-2 text-slate-700">{item.productName}</td>
                        <td className="px-3 py-2 text-slate-500">{formatScanTime(item.scannedAt)}</td>
                        <td className="px-3 py-2">
                          <span className={`rounded-md border px-2 py-1 text-xs font-medium ${scoreTone(item.healthScore)}`}>
                            {item.healthScore}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <span className={`rounded-md border px-2 py-1 text-xs font-medium ${badgeClass[item.expiryStatus]}`}>
                            {item.expiryStatus}
                          </span>
                        </td>
                      </tr>
                    ))}

                    {!historyLoading && filteredHistory.length === 0 ? (
                      <tr>
                        <td className="px-3 py-4 text-sm text-slate-500" colSpan={4}>
                          {historyView === 'favorites'
                            ? 'No favorite history available.'
                            : 'No scan history available.'}
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}

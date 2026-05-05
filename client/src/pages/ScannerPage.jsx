import { useCallback, useMemo, useRef, useState } from 'react';
import { useBarcodeScanner } from '../hooks/useBarcodeScanner.js';
import { detectExpiryFromVideo } from '../services/ocrService.js';
import { useScanHistory } from '../hooks/useScanHistory.js';
import { badgeClass, scoreTone, severityClass, statusToProgress } from '../utils/dashboardUi.js';

export default function ScannerPage() {
  const videoRef = useRef(null);

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

  const { api, loadHistory, favoriteSet, toggleFavorite } = useScanHistory();

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
    if (!product) return;

    setAnalysisLoading(true);
    setProductError('');

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

  const handleImageBarcodeUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      await scanImageFile(file);
    } catch {
      // Scanner error state is handled in hook.
    } finally {
      event.target.value = '';
    }
  };

  const insightItems = analysis?.highlightedIngredients || [];
  const riskSummary = useMemo(
    () =>
      insightItems.reduce(
        (acc, item) => {
          if (item.severity === 'high') acc.high += 1;
          else if (item.severity === 'medium') acc.moderate += 1;
          else acc.safe += 1;
          return acc;
        },
        { safe: 0, moderate: 0, high: 0 }
      ),
    [insightItems]
  );

  const riskTotal = Math.max(1, riskSummary.safe + riskSummary.moderate + riskSummary.high);
  const safeDeg = (riskSummary.safe / riskTotal) * 360;
  const moderateDeg = (riskSummary.moderate / riskTotal) * 360;
  const chartStyle = {
    background: `conic-gradient(#20c77a 0deg ${safeDeg}deg, #ff9f1c ${safeDeg}deg ${safeDeg + moderateDeg}deg, #ff5d5d ${safeDeg + moderateDeg}deg 360deg)`
  };

  return (
    <>
      <section className="soft-card rounded-2xl p-4 md:p-5">
        <div className="grid gap-4 md:grid-cols-[1.3fr,0.9fr] md:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: 'var(--muted)' }}>Scan a Product</p>
            <h2 className="mt-2 text-xl font-semibold" style={{ color: 'var(--ink)' }}>Use your camera to scan barcode and capture product details</h2>
            <p className="mt-2 text-sm" style={{ color: 'var(--muted)' }}>Barcode: <span className="font-medium" style={{ color: 'var(--ink)' }}>{barcode || 'Waiting for scan'}</span></p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  clearScannerError();
                  setScannerActive((prev) => !prev);
                }}
                disabled={!cameraSupported}
                className="brand-primary rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-60"
              >
                {scannerActive ? 'Stop Scanning' : 'Start Scanning'}
              </button>
              <button
                type="button"
                onClick={runOcr}
                disabled={!scannerActive || ocrLoading}
                className="rounded-lg border px-4 py-2 text-sm font-medium disabled:opacity-60"
                style={{ borderColor: 'var(--border)', color: 'var(--teal)', background: 'var(--surface)' }}
              >
                {ocrLoading ? 'Reading...' : 'Detect Expiry'}
              </button>
              <label className="cursor-pointer rounded-lg border px-4 py-2 text-sm font-medium hover:bg-[color:var(--surface-2)]" style={{ borderColor: 'var(--border)', color: 'var(--teal)' }}>
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
          </div>

          <div className="relative overflow-hidden rounded-2xl border p-4" style={{ borderColor: 'var(--border)', background: 'linear-gradient(135deg, rgba(255,255,255,0.96) 0%, rgba(255,224,234,0.95) 48%, rgba(225,255,240,0.95) 100%)' }}>
            {product?.imageUrl ? (
              <img src={product.imageUrl} alt="Product" className="h-36 w-full rounded-xl object-contain" />
            ) : (
              <div className="flex h-36 items-center justify-center rounded-xl border border-dashed bg-white/70 text-sm" style={{ borderColor: 'color-mix(in srgb, var(--green) 30%, white)', color: 'var(--muted)' }}>
                Product preview appears here
              </div>
            )}
            <span className={`absolute left-3 top-3 rounded-full border px-2 py-1 text-xs font-medium ${badgeClass[expiry.status]}`}>
              {expiry.status}
            </span>
          </div>
        </div>

        {scannerError || ocrError || productError ? (
          <p className="mt-3 text-sm" style={{ color: 'var(--danger)' }}>{scannerError || ocrError || productError}</p>
        ) : null}
      </section>

      <div className="grid gap-4 xl:grid-cols-[1fr,1.1fr]">
        <section className="soft-card rounded-2xl p-4 md:p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-semibold" style={{ color: 'var(--ink)' }}>Scanner (Camera View)</h3>
            <span className="text-xs" style={{ color: 'var(--muted)' }}>Align barcode within frame</span>
          </div>

          <div className="relative overflow-hidden rounded-xl border" style={{ borderColor: 'var(--border)', background: 'linear-gradient(135deg, #2a1141 0%, #20295b 45%, #137a63 100%)' }}>
            <video ref={videoRef} autoPlay playsInline muted className="h-[280px] w-full object-cover" />
            <div className="pointer-events-none absolute left-6 right-6 top-1/2 h-0.5 -translate-y-1/2" style={{ background: 'var(--amber)', boxShadow: '0 0 22px rgba(255,159,28,0.75)' }} />
          </div>
        </section>

        <section className="soft-card rounded-2xl p-4 md:p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-semibold" style={{ color: 'var(--ink)' }}>Product Details & AI Analysis</h3>
            <button
              type="button"
              disabled={!product || analysisLoading || productLoading}
              onClick={runAnalysis}
              className="brand-primary rounded-lg px-3 py-1.5 text-sm font-medium disabled:opacity-60"
            >
              {analysisLoading ? 'Analyzing...' : 'Run Analysis'}
            </button>
          </div>

          {product ? (
            <>
              <div className="flex items-start gap-3 rounded-xl border p-3" style={{ borderColor: 'var(--border)' }}>
                <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl" style={{ background: 'var(--surface-2)' }}>
                  {product.imageUrl ? <img src={product.imageUrl} alt={product.productName} className="h-full w-full object-cover" /> : <span className="text-2xl">Box</span>}
                </div>
                <div className="flex-1">
                  <p className="text-lg font-semibold" style={{ color: 'var(--ink)' }}>{product.productName}</p>
                  <p className="text-xs" style={{ color: 'var(--muted)' }}>Brand: {product.brands || 'Unknown'} · Barcode: {product.barcode}</p>
                  <button
                    type="button"
                    onClick={() => toggleFavorite(product.barcode)}
                    className="mt-2 rounded-md border px-2 py-1 text-xs hover:bg-[color:var(--surface-2)]"
                    style={{ borderColor: 'var(--border)', color: 'var(--teal)' }}
                  >
                    {product.barcode && favoriteSet.has(product.barcode) ? 'Remove Favorite ★' : 'Add Favorite ☆'}
                  </button>
                </div>
                <div className={`rounded-xl border px-3 py-2 text-center ${scoreTone(analysis?.healthScore ?? 0)}`}>
                  <p className="text-2xl font-semibold leading-none">{analysis?.healthScore ?? '--'}</p>
                  <p className="text-[10px] uppercase tracking-wider">health score</p>
                </div>
              </div>

              <div className="mt-3 rounded-xl border p-3" style={{ borderColor: 'var(--border)' }}>
                <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>AI Summary</p>
                <p className="mt-2 text-sm leading-6" style={{ color: 'var(--muted)' }}>
                  {analysis?.simplifiedExplanation || 'Run AI analysis to see easy-to-read health insights and warnings.'}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(analysis?.highlightedIngredients || []).slice(0, 5).map((item) => (
                    <span
                      key={`${item.label}-${item.severity}`}
                      className={`rounded-full border px-3 py-1 text-xs font-medium ${severityClass[item.color] || 'bg-[color:var(--surface-2)] text-[color:var(--muted)] border-[color:var(--border)]'}`}
                    >
                      {item.label}
                    </span>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm" style={{ color: 'var(--muted)' }}>{productLoading ? 'Fetching product details...' : 'No product scanned yet.'}</p>
          )}
        </section>
      </div>

      <section className="soft-card rounded-2xl p-4 md:p-5">
        <h3 className="text-lg font-semibold" style={{ color: 'var(--ink)' }}>Ingredient Safety Breakdown</h3>
        <div className="mt-4 flex items-center gap-4">
          <div className="relative h-28 w-28 rounded-full" style={chartStyle}>
            <div className="absolute inset-3 rounded-full bg-white" />
          </div>

          <div className="space-y-2 text-sm" style={{ color: 'var(--muted)' }}>
            <p className="flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ background: 'var(--green)' }} />Safe ({riskSummary.safe})</p>
            <p className="flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ background: 'var(--amber)' }} />Moderate ({riskSummary.moderate})</p>
            <p className="flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ background: 'var(--danger)' }} />High Risk ({riskSummary.high})</p>
          </div>
        </div>

        <div className="mt-4 rounded-xl border p-3" style={{ borderColor: 'var(--border)' }}>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>Expiry Timeline</p>
          <div className="relative mt-6 h-1 rounded-full bg-gradient-to-r from-[color:var(--green)] via-[color:var(--amber)] to-[color:var(--danger)]">
            <span
              className="absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border-2"
              style={{ background: 'var(--teal)', left: `${statusToProgress[expiry.status]}%`, borderColor: 'var(--surface)' }}
            />
          </div>
        </div>
      </section>
    </>
  );
}

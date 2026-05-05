import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useBarcodeScanner } from '../hooks/useBarcodeScanner.js';
import { detectExpiryFromVideo } from '../services/ocrService.js';
import { useScanHistory } from '../hooks/useScanHistory.js';
import { useGamification } from '../hooks/useGamification.js';
import { badgeClass, scoreTone, severityClass, statusToProgress } from '../utils/dashboardUi.js';

const defaultExpiryState = {
  status: 'Unknown',
  expiryDate: null,
  daysRemaining: null,
  confidence: 0,
  source: 'none',
  reason: 'No expiry analysis run yet.',
  riskLevel: 'unknown',
  freshnessWindowDays: 7,
  storageAdvice: null,
  actions: [],
  extractedCandidates: [],
  ocrConfidence: null
};

export default function ScannerPage() {
  const videoRef = useRef(null);

  const [scannerActive, setScannerActive] = useState(false);
  const [barcode, setBarcode] = useState('');
  const [product, setProduct] = useState(null);
  const [productError, setProductError] = useState('');
  const [productLoading, setProductLoading] = useState(false);

  const [analysis, setAnalysis] = useState(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);

  const [expiry, setExpiry] = useState(defaultExpiryState);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrError, setOcrError] = useState('');

  const { api, loadHistory, favoriteSet, toggleFavorite } = useScanHistory();
  const { processScan: processGamification } = useGamification();

  const [pointsToast, setPointsToast] = useState(null);

  // Auto-dismiss points toast after 5s
  useEffect(() => {
    if (!pointsToast) return;
    const timer = setTimeout(() => setPointsToast(null), 5000);
    return () => clearTimeout(timer);
  }, [pointsToast]);

  const fetchProduct = useCallback(
    async (code) => {
      setBarcode(code);
      setProductLoading(true);
      setProductError('');
      setAnalysis(null);
      setExpiry(defaultExpiryState);
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
      const ocrResult = await detectExpiryFromVideo(videoRef.current);
      const response = await api.analyzeExpiry({
        ocrText: ocrResult.rawText,
        product: product
          ? {
              productName: product.productName,
              categories: product.categories || null,
              expiryInfo: product.expiryInfo || null,
              storageConditions: product.storageConditions || null
            }
          : null
      });
      setExpiry({ ...response.expiry, ocrConfidence: ocrResult.ocrConfidence });
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

      // ── Gamification: process the scan for points ──
      if (product.barcode && response.analysis.healthScore != null) {
        const gamResult = await processGamification(product.barcode, response.analysis.healthScore);
        if (gamResult) {
          setPointsToast(gamResult);
        }
      }
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
    background: `conic-gradient(#19a463 0deg ${safeDeg}deg, #2f8fbe ${safeDeg}deg ${safeDeg + moderateDeg}deg, #d03b51 ${safeDeg + moderateDeg}deg 360deg)`
  };

  return (
    <>
      {/* ── Points Earned Toast ── */}
      {pointsToast && (
        <div className="points-toast ui-fade-in soft-card fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl border px-5 py-4 shadow-2xl" style={{ borderColor: 'var(--border)' }}>
          <div className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: 'var(--green-soft)' }}>
            <span className="text-xl">⚡</span>
          </div>
          <div>
            <p className="text-sm font-bold tabular-nums" style={{ color: 'var(--ink)' }}>+{pointsToast.pointsEarned + (pointsToast.achievementBonus || 0)} Points</p>
            <p className="text-[10px]" style={{ color: 'var(--muted)' }}>
              Base {pointsToast.breakdown?.base} × {pointsToast.breakdown?.streakMultiplier}x streak
              {pointsToast.breakdown?.discoveryBonus > 0 ? ` + ${pointsToast.breakdown.discoveryBonus} discovery` : ''}
            </p>
            {pointsToast.newBadges?.length > 0 && (
              <p className="mt-1 text-xs font-semibold" style={{ color: 'var(--green)' }}>
                🏆 {pointsToast.newBadges.map((b) => `${b.icon} ${b.name}`).join(', ')}
              </p>
            )}
            {pointsToast.leveledUp && (
              <p className="mt-0.5 text-xs font-bold" style={{ color: 'var(--teal)' }}>🎉 Level Up! → {pointsToast.levelTitle}</p>
            )}
          </div>
          <button type="button" onClick={() => setPointsToast(null)} className="ml-2 text-xs" style={{ color: 'var(--muted)' }}>✕</button>
        </div>
      )}
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
                className="brand-primary w-full rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-60 sm:w-auto"
              >
                {scannerActive ? 'Stop Scanning' : 'Start Scanning'}
              </button>
              <button
                type="button"
                onClick={runOcr}
                disabled={!scannerActive || ocrLoading}
                className="w-full rounded-lg border px-4 py-2 text-sm font-medium disabled:opacity-60 sm:w-auto"
                style={{ borderColor: 'var(--border)', color: 'var(--teal)', background: 'var(--surface)' }}
              >
                {ocrLoading ? 'Reading...' : 'Detect Expiry'}
              </button>
              <label className="w-full cursor-pointer rounded-lg border px-4 py-2 text-sm font-medium hover:bg-[color:var(--surface-2)] sm:w-auto" style={{ borderColor: 'var(--border)', color: 'var(--teal)' }}>
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

          <div className="relative overflow-hidden rounded-2xl border p-4" style={{ borderColor: 'var(--border)', background: 'linear-gradient(135deg, rgba(255,255,255,0.96) 0%, rgba(223,232,255,0.94) 46%, rgba(227,248,237,0.95) 100%)' }}>
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

          <div className="relative overflow-hidden rounded-xl border" style={{ borderColor: 'var(--border)', background: 'linear-gradient(135deg, #071434 0%, #0b1f4d 46%, #188b57 100%)' }}>
            <video ref={videoRef} autoPlay playsInline muted className="h-[220px] w-full object-cover sm:h-[280px]" />
            <div className="pointer-events-none absolute left-6 right-6 top-1/2 h-0.5 -translate-y-1/2" style={{ background: 'var(--green)', boxShadow: '0 0 22px rgba(25,164,99,0.72)' }} />
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
              <div className="flex flex-col gap-3 rounded-xl border p-3 sm:flex-row sm:items-start" style={{ borderColor: 'var(--border)' }}>
                <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl sm:h-16 sm:w-16" style={{ background: 'var(--surface-2)' }}>
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
                <div className={`w-fit rounded-xl border px-3 py-2 text-center sm:ml-auto ${scoreTone(analysis?.healthScore ?? 0)}`}>
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
        <div className="mt-4 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
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
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <p className="text-xs" style={{ color: 'var(--muted)' }}>
              Expiry Date: <span style={{ color: 'var(--ink)' }}>{expiry.expiryDate || 'Not detected'}</span>
            </p>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>
              Days Remaining: <span style={{ color: 'var(--ink)' }}>{expiry.daysRemaining ?? 'Unknown'}</span>
            </p>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>
              Confidence: <span style={{ color: 'var(--ink)' }}>{Math.round((expiry.confidence || 0) * 100)}%</span>
            </p>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>
              Source: <span style={{ color: 'var(--ink)' }}>{expiry.source === 'ocr' ? 'OCR label' : expiry.source === 'product_meta' ? 'Product metadata' : 'Not available'}</span>
            </p>
            <p className="text-xs sm:col-span-2" style={{ color: 'var(--muted)' }}>
              Reason: <span style={{ color: 'var(--ink)' }}>{expiry.reason}</span>
            </p>
            {expiry.storageAdvice ? (
              <p className="text-xs sm:col-span-2" style={{ color: 'var(--muted)' }}>
                Storage Advice: <span style={{ color: 'var(--ink)' }}>{expiry.storageAdvice}</span>
              </p>
            ) : null}
            {expiry.ocrConfidence !== null ? (
              <p className="text-xs sm:col-span-2" style={{ color: 'var(--muted)' }}>
                OCR Read Quality: <span style={{ color: 'var(--ink)' }}>{Math.round((expiry.ocrConfidence || 0) * 100)}%</span>
              </p>
            ) : null}
          </div>
        </div>

        <div className="mt-3 rounded-xl border p-3" style={{ borderColor: 'var(--border)' }}>
          <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>Expiry Recommendations</p>
          {expiry.actions?.length ? (
            <ul className="mt-2 space-y-1 text-sm" style={{ color: 'var(--muted)' }}>
              {expiry.actions.map((action) => (
                <li key={action}>- {action}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm" style={{ color: 'var(--muted)' }}>
              Run Detect Expiry to get actionable recommendations.
            </p>
          )}
          {expiry.extractedCandidates?.length ? (
            <p className="mt-3 text-xs" style={{ color: 'var(--muted)' }}>
              Candidate dates found: {expiry.extractedCandidates.map((item) => `${item.date} (${Math.round(item.confidence * 100)}%)`).join(', ')}
            </p>
          ) : null}
        </div>
      </section>
    </>
  );
}

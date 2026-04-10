/**
 * Priority Engine Unit Tests
 * Tests the multi-factor urgency scoring system for waste reports.
 */
import { describe, it, expect } from 'vitest';
import { calculatePriority } from '@/lib/priority-engine';

// ── Test data factories ──

function makeReport(overrides: Partial<{
    confirmed_class: string;
    predicted_class: string;
    prediction_confidence: number;
    quantity_estimate: string;
    created_at: string;
    latitude: number;
    longitude: number;
}> = {}) {
    return {
        id: 'test-report-1',
        user_id: 'user-1',
        neighborhood_id: 'hood-1',
        status: 'pending',
        confirmed_class: overrides.confirmed_class ?? 'plastic',
        predicted_class: overrides.predicted_class ?? 'plastic',
        prediction_confidence: overrides.prediction_confidence ?? 0.9,
        quantity_estimate: overrides.quantity_estimate ?? 'medium',
        created_at: overrides.created_at ?? new Date().toISOString(),
        latitude: overrides.latitude ?? 12.9716,
        longitude: overrides.longitude ?? 77.5946,
        photo_url: 'https://example.com/photo.jpg',
        address_text: '123 Test St',
        ai_available: true,
    };
}

// ── Score range tests ──

describe('calculatePriority', () => {
    it('should return a score between 0 and 100', () => {
        const report = makeReport();
        const input = {
            id: report.id,
            wasteType: report.confirmed_class || report.predicted_class,
            createdAt: report.created_at,
            quantity: report.quantity_estimate,
            latitude: report.latitude,
            longitude: report.longitude,
            predictionConfidence: report.prediction_confidence,
            status: report.status,
        };
        const result = calculatePriority(input, []);

        expect(result.score).toBeGreaterThanOrEqual(0);
        expect(result.score).toBeLessThanOrEqual(100);
    });

    it('should return a valid tier', () => {
        const report = makeReport();
        const input = {
            id: report.id,
            wasteType: report.confirmed_class || report.predicted_class,
            createdAt: report.created_at,
            quantity: report.quantity_estimate,
            latitude: report.latitude,
            longitude: report.longitude,
            predictionConfidence: report.prediction_confidence,
            status: report.status,
        };
        const result = calculatePriority(input, []);

        expect(['low', 'medium', 'high', 'critical']).toContain(result.tier);
    });

    it('should include factor breakdown', () => {
        const report = makeReport();
        const input = {
            id: report.id,
            wasteType: report.confirmed_class || report.predicted_class,
            createdAt: report.created_at,
            quantity: report.quantity_estimate,
            latitude: report.latitude,
            longitude: report.longitude,
            predictionConfidence: report.prediction_confidence,
            status: report.status,
        };
        const result = calculatePriority(input, []);

        expect(result.breakdown).toBeDefined();
        expect(result.breakdown.wasteTypeScore).toBeGreaterThanOrEqual(0);
        expect(result.breakdown.ageScore).toBeGreaterThanOrEqual(0);
        expect(result.breakdown.quantityScore).toBeGreaterThanOrEqual(0);
        expect(result.breakdown.densityScore).toBeGreaterThanOrEqual(0);
        expect(result.breakdown.confidenceScore).toBeGreaterThanOrEqual(0);
    });
});

// ── Waste type priority ──

describe('Waste type factor', () => {
    it('should rank organic waste higher than paper', () => {
        const organic = makeReport({ confirmed_class: 'organic' });
        const paper = makeReport({ confirmed_class: 'paper' });

        const organicResult = calculatePriority({ id: organic.id, wasteType: organic.confirmed_class, createdAt: organic.created_at }, []);
        const paperResult = calculatePriority({ id: paper.id, wasteType: paper.confirmed_class, createdAt: paper.created_at }, []);

        expect(organicResult.breakdown.wasteTypeScore).toBeGreaterThan(paperResult.breakdown.wasteTypeScore);
    });

    it('should use predicted_class if preferred', () => {
        const report = makeReport({
            predicted_class: 'organic',
        });
        const result = calculatePriority({ id: report.id, wasteType: report.predicted_class, createdAt: report.created_at }, []);

        expect(result.breakdown.wasteTypeScore).toBeGreaterThan(0.8);
    });
});

// ── Age (SLA) factor ──

describe('Age (SLA) factor', () => {
    it('should score new reports lower than old reports', () => {
        const newReport = makeReport({
            created_at: new Date().toISOString(),
        });
        const oldReport = makeReport({
            created_at: new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString(), // 20 hours ago
        });

        const newResult = calculatePriority({ id: newReport.id, wasteType: newReport.confirmed_class, createdAt: newReport.created_at }, []);
        const oldResult = calculatePriority({ id: oldReport.id, wasteType: oldReport.confirmed_class, createdAt: oldReport.created_at }, []);

        expect(oldResult.breakdown.ageScore).toBeGreaterThan(newResult.breakdown.ageScore);
    });

    it('should max out at SLA breach', () => {
        const breachedReport = makeReport({
            created_at: new Date(Date.now() - 30 * 60 * 60 * 1000).toISOString(), // 30 hours ago (past 24h SLA)
        });

        const result = calculatePriority({ id: breachedReport.id, wasteType: breachedReport.confirmed_class, createdAt: breachedReport.created_at }, []);

        expect(result.breakdown.ageScore).toBeGreaterThanOrEqual(0.95);
    });
});

// ── Quantity factor ──

describe('Quantity factor', () => {
    it('should score large quantities higher than small', () => {
        const large = makeReport({ quantity_estimate: 'large' });
        const small = makeReport({ quantity_estimate: 'small' });

        const largeResult = calculatePriority({ id: large.id, wasteType: large.confirmed_class, createdAt: large.created_at, quantity: large.quantity_estimate }, []);
        const smallResult = calculatePriority({ id: small.id, wasteType: small.confirmed_class, createdAt: small.created_at, quantity: small.quantity_estimate }, []);

        expect(largeResult.breakdown.quantityScore).toBeGreaterThan(smallResult.breakdown.quantityScore);
    });
});

// ── Density factor ──

describe('Density factor', () => {
    it('should increase score when nearby reports exist', () => {
        const report = makeReport({
            latitude: 12.9716,
            longitude: 77.5946,
        });

        // Create nearby reports
        const nearbyReports = [
            makeReport({ latitude: 12.9720, longitude: 77.5950 }),
            makeReport({ latitude: 12.9718, longitude: 77.5948 }),
        ];
        
        const mappedNearby = nearbyReports.map(r => ({ latitude: r.latitude, longitude: r.longitude }));

        const aloneResult = calculatePriority({ id: report.id, wasteType: report.confirmed_class, createdAt: report.created_at, latitude: report.latitude, longitude: report.longitude }, []);
        const denseResult = calculatePriority({ id: report.id, wasteType: report.confirmed_class, createdAt: report.created_at, latitude: report.latitude, longitude: report.longitude }, mappedNearby as any);

        expect(denseResult.breakdown.densityScore).toBeGreaterThan(aloneResult.breakdown.densityScore);
    });
});

// ── AI Confidence factor ──

describe('AI Confidence factor', () => {
    it('should score low-confidence reports higher (needs human review)', () => {
        const lowConf = makeReport({ prediction_confidence: 0.3 });
        const highConf = makeReport({ prediction_confidence: 0.95 });

        const lowResult = calculatePriority({ id: lowConf.id, wasteType: lowConf.confirmed_class, createdAt: lowConf.created_at, predictionConfidence: lowConf.prediction_confidence }, []);
        const highResult = calculatePriority({ id: highConf.id, wasteType: highConf.confirmed_class, createdAt: highConf.created_at, predictionConfidence: highConf.prediction_confidence }, []);

        expect(lowResult.breakdown.confidenceScore).toBeGreaterThan(highResult.breakdown.confidenceScore);
    });
});

// ── Tier classification ──

describe('Tier classification', () => {
    it('should classify SLA-breached organic waste as critical', () => {
        const criticalReport = makeReport({
            confirmed_class: 'organic',
            quantity_estimate: 'large',
            created_at: new Date(Date.now() - 30 * 60 * 60 * 1000).toISOString(),
            prediction_confidence: 0.3,
        });

        const nearbyReports = [
            makeReport({ latitude: 12.9720, longitude: 77.5950 }),
            makeReport({ latitude: 12.9718, longitude: 77.5948 }),
            makeReport({ latitude: 12.9715, longitude: 77.5944 }),
        ];
        
        const mappedNearby = nearbyReports.map(r => ({ latitude: r.latitude, longitude: r.longitude }));

        const result = calculatePriority({ 
            id: criticalReport.id, 
            wasteType: criticalReport.confirmed_class, 
            createdAt: criticalReport.created_at,
            quantity: criticalReport.quantity_estimate,
            latitude: criticalReport.latitude,
            longitude: criticalReport.longitude,
            predictionConfidence: criticalReport.prediction_confidence
        }, mappedNearby as any);

        expect(result.tier).toBe('critical');
        expect(result.score).toBeGreaterThanOrEqual(75);
    });

    it('should classify fresh small paper waste as low', () => {
        const lowReport = makeReport({
            confirmed_class: 'paper',
            quantity_estimate: 'small',
            created_at: new Date().toISOString(),
            prediction_confidence: 0.95,
        });

        const result = calculatePriority({ 
            id: lowReport.id, 
            wasteType: lowReport.confirmed_class, 
            createdAt: lowReport.created_at,
            quantity: lowReport.quantity_estimate,
            predictionConfidence: lowReport.prediction_confidence
        }, []);

        expect(['low', 'medium']).toContain(result.tier);
        expect(result.score).toBeLessThan(55);
    });
});

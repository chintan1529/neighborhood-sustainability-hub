import { createAdminClient } from '@/lib/supabase/server';
import seedData from '@/data/government_benchmarks_seed.json';

/**
 * Seed government benchmark data from the curated JSON dataset.
 * Uses UPSERT to avoid duplicates on re-runs.
 */
export async function seedGovernmentBenchmarks(): Promise<{ inserted: number; errors: number }> {
    const supabase = createAdminClient();
    let inserted = 0;
    let errors = 0;

    for (const row of seedData) {
        const { error } = await supabase
            .from('government_benchmarks')
            .upsert(
                {
                    city: row.city,
                    state: row.state,
                    cleanliness_rank: row.cleanliness_rank,
                    cleanliness_score: row.cleanliness_score,
                    waste_processed_tpd: row.waste_processed_tpd,
                    door_to_door_coverage_pct: row.door_to_door_coverage_pct,
                    source_segregation_pct: row.source_segregation_pct,
                    population_lakhs: row.population_lakhs,
                    survey_year: row.survey_year,
                    survey_source: 'swachh_survekshan',
                },
                { onConflict: 'city,survey_year,survey_source' }
            );

        if (error) {
            console.error(`Failed to seed ${row.city}:`, error.message);
            errors++;
        } else {
            inserted++;
        }
    }

    return { inserted, errors };
}

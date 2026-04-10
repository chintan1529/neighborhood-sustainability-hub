-- ============================================================================
-- NEIGHBORHOOD SUSTAINABILITY HUB
-- Migration 00009: Seed Starter Badges
-- ============================================================================

INSERT INTO badges (name, slug, description, tier, color, points_reward, requirements)
VALUES 
    (
        'First Step', 
        'first-report', 
        'Submitted your very first waste report.', 
        1, 
        '#10B981', -- Emerald
        10, 
        '{"type": "reports_count", "threshold": 1}'
    ),
    (
        'Eco Regular', 
        'eco-regular-10', 
        'Submitted 10 waste reports.', 
        2, 
        '#3B82F6', -- Blue
        25, 
        '{"type": "reports_count", "threshold": 10}'
    ),
    (
        'Streak Starter', 
        'streak-3', 
        'Maintained a 3-day reporting streak.', 
        2, 
        '#F59E0B', -- Amber
        20, 
        '{"type": "streak", "threshold": 3}'
    ),
    (
        'Plastic Patrol', 
        'plastic-patrol-5', 
        'Reported 5 plastic waste items.', 
        3, 
        '#8B5CF6', -- Violet
        30, 
        '{"type": "category_count", "threshold": 5, "category": "plastic"}'
    ),
    (
        'Compost Champion', 
        'organic-champ-5', 
        'Reported 5 organic waste items.', 
        3, 
        '#14B8A6', -- Teal
        30, 
        '{"type": "category_count", "threshold": 5, "category": "organic"}'
    )
ON CONFLICT (slug) DO NOTHING;

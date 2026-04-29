# Trip Planner Pro 2 — Premium Design System

## Direction

Dark mode only. The product should feel like a calm premium travel companion: Apple-level restraint, Airbnb-style trip confidence, and a warm vacation mood. The main visual signature is a mint travel hero surface paired with sun-gold highlights.

## Core Tokens

| Role | Value | Usage |
| --- | --- | --- |
| `backgroundBase` | `#090806` | App background |
| `surface` | `#171512` | Cards, nav, sheets |
| `elevated` | `#242018` | Floating controls, menus |
| `border` | `#332E25` | Visible dividers |
| `borderSoft` | `#252119` | Subtle outlines |
| `textPrimary` | `#FFFFFF` | Titles, primary data |
| `textSecondary` | `#C6BDAE` | Labels, metadata |
| `textTertiary` | `#81786A` | Disabled, secondary metadata |
| `travelMint` | `#71D3A6` | Hero travel identity, active trip emphasis |
| `sunGold` | `#FFD16A` | Progress, selected nav, premium highlights |
| `aiPurple` | `#A891E8` | AI/FAB only |
| `coastBlue` | `#6CAFE8` | Flights, future status |

## Components

- **Hero trip card**: large rounded card, mint-to-dark gradient top, dark stat section bottom, status label, trip title, day/countdown, progress, yearly stats and total block.
- **Trip cards**: horizontal, rounded, warm surface, circular travel icon, destination/year, date range, compact status pill.
- **Calendar cells**: always 7 columns; compact cells with date, flag, city, city day counter, max 3 item badges on desktop and compact overflow indicator.
- **Navigation**: dark translucent bottom nav on mobile, warm dark top nav on desktop, sun-gold selected state, purple central FAB reserved for create/AI.

## Calendar Rule

The calendar never collapses to a one-day-per-row layout. Web and iOS must keep seven columns. Rows represent calendar weeks from Monday to Sunday; days outside the trip range are dimmed, not removed.

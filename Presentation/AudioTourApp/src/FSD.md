/**
 * FSD Architecture Structure
 * 
 * shared/     - Reusable utilities, components, and types used across slices
 * entities/   - Core business entities (POI, User, etc.)
 * features/   - Feature-specific slices organized by domain
 *   - Each feature has: ui/, model/, lib/, api/
 * widgets/    - Composite components combining features and entities
 * pages/      - Page-level route components
 * app/        - Application root and global configuration
 */

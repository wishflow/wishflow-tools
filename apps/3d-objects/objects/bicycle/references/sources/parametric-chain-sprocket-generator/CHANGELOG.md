# Changelog

## 1.8.0

- Replaced the Boolean chain-support union with directly constructed, index-aligned ring topology.
- Connected every sprocket-profile vertex to its corresponding support and bore vertex with quad strips; generated support meshes now contain only quad faces.
- Removed the recurring 5T–8T Blender warning popup while retaining the drivetrain caveat in the documentation.
- Changed the default `Support Rim Offset` to `-0.360 mm` for additional clearance from the roller-seat edge.
- Limited the support offset to negative values so the circular support ring always remains inside the root profile without crossed or degenerate quads.
- Preserved one connected manifold component, positive volume, the through bore, directional tooth pitch, bilateral support, Unit Scale, overall Scale, and the optional bevel.
- Added exact ring-count, angular-alignment, all-quad, and 5T–150T topology verification.
- Added a winding-safe directional-pitch limiter and a near-linear C1 influence curve, preserving requested 6°/15° cases where geometrically possible while automatically reducing impossible values and retaining at least 10% of every undeformed angular gap.
- Added 5T–150T cyclic-order, local-quad-winding, manifold, and signed-volume regression coverage plus ±15° stress verification.

## 1.7.0

- Renamed the add-on to **Parametric Chain Sprocket Generator**.
- Replaced the fixed 0.45 mm tooth height with a tooth-count-dependent default outside diameter.
- Added `Tooth Height Adjustment` as a signed radial offset from the calculated standard profile.
- Added independent pitch- and outside-diameter checks for 11T, 12T, 20T, 32T, 52T, 100T, and 150T.
- Renamed the installable Python package and generated release artifacts.
- Documented removal of the old package before upgrading, because Blender treats the renamed package as a separate add-on.
- Expanded the representative profile and Blender demo sets beyond 11 teeth.
- Increased chain-support sampling to prevent sparse legacy `EXACT` unions from leaving non-manifold edges at 8T, 12T, and 16T.
- Rebuilt the optional demo files with Blender 4.2 LTS and documented their Blender 4.2+ file-format requirement separately from the Blender 3.6+ add-on.

## 1.6.1

- Fixed bilateral support topology on Blender versions that use the legacy `EXACT` Boolean path.
- Combined both support operands before applying one union, avoiding non-manifold edges from sequential legacy unions.
- Applied directional Tooth Tip Pitch after the support union so strongly pitched profiles remain watertight on both legacy and current Boolean solvers.
- Expanded transactional cleanup to handle every normal modifier exception type, not only `RuntimeError`.
- Added regression coverage on both Blender Python 4.2 (`EXACT`) and 5.0 (`MANIFOLD`) paths.

## 1.6.0

- Integrated the chain support into the sprocket as one connected, watertight mesh for 3D printing.
- Added an optional `Support on Both Sides` control for a bilateral integrated platform.
- Applied the support union during creation; no helper or child object remains.
- Added clean Boolean-failure rollback and a Blender-version-aware solver fallback that prefers `EXACT` over legacy `FAST`.
- Preserved signed Support Rim Offset, Support Height, Unit Scale, overall Scale, and bevel support.
- Increased the maximum overall Scale from 100 to 1000.
- Replaced the Tooth Tip Pitch diagram with an updated same-direction deformation view.

## 1.5.0

- Added an optional annular chain-support platform, enabled by default.
- Positioned the default support rim at the roller-seat root circle.
- Added Support Height and signed Support Rim Offset controls.
- Added a Reset All Settings button at the bottom of the operator panel.
- Removed the public Profile Rotation control.
- Added manifold, unit-scale, overall-scale, bevel, reset, and rim validation tests for the support.

## 1.4.0

- Added bicycle chain presets for 1/8", 3/32", and 11/128" chains.
- Added motorcycle chain presets for 415, 420, 428, 520, 525, and 530 chains.
- Added Custom mode for manually entered chain dimensions.
- Presets configure pitch, roller diameter, and a conservative suggested sprocket thickness.

## 1.3.0

- Added straight tangential tooth-tip flattening.
- Added validation for excessive flattening values.

## 1.2.1

- Changed Tooth Tip Pitch so upper and lower tooth contours move together in the same tangential direction.

## 1.2.0

- Added uniform Scale control.
- Added directional Tooth Tip Pitch.

## 1.1.0

- Added explicit roller-seat endpoints and C2-continuous quintic Hermite flanks.
- Added Blender Unit Scale support and standard Add Mesh placement.
- Matched the default 11T outside diameter to the supplied reference.

## 1.0.0

- Initial parametric 5T–11T bicycle-chain sprocket generator.

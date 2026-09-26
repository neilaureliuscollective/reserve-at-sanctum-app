# Asset provenance

The three scenes were generated specifically for this project using imagegen
during this build, then compressed to WebP with Sharp. They are **concept art**,
not photographs of existing facilities or purchasable products. Visible concept
labels are part of the interface and should remain until imagery is replaced.

| Asset         | Direction                                                                                                               |
| ------------- | ----------------------------------------------------------------------------------------------------------------------- |
| arrival.webp  | Dark modern sanctuary arch, warm gold rim, Louisiana live oak beyond, left-hand negative space for readable type        |
| fix-it.webp   | Katie's envisioned navy/gold men's salon, refined salon chair and carefully arranged tools, no people or barber imagery |
| aurelius.webp | Purple/obsidian alcove, bronze Atlas sphere sculpture, journal, coffee, unbranded objects, no product or health claims  |
| gent-ascend-emblem.png | User-provided GENT Ascend Collective emblem used in the rebranded world |
| reserve-grooming-concept.webp | Approved three-scene concept illustration of a men's salon visit, grooming ritual, and small-town conversation; converted to WebP for the September 23 homepage. It does not depict Katie, Neil, actual customers, the finished location, or products for sale. |
| reserve-petrol-official.webp | Newly approved Reserve at Sanctum petrol/gold emblem; the original 1536px supplied JPEG was converted to a high-detail WebP with feathered corner isolation. Wording, composition, Louisiana silhouette, marble, and metallic detailing are unchanged. The hero stage and footer use this canonical asset. |
| reserve-official.jpg | Previous supplied navy Reserve emblem retained in the repository as historical reference; no longer displayed. |
| fix-it-official.jpg | User-supplied official Fix It Shop gold/navy emblem; displayed in Katie's arrival and the world card. |
| gent-ascend-official.jpg | User-supplied official GENT Ascend Collective gold/emerald emblem; displayed in the GENT arrival and world card. |

The icon and small header mark are custom SVG geometry for legibility at small
sizes, not replacements for the official illustrated emblems. Raster home-screen
icons are exports from that SVG. The former generic WebGL seal was replaced by
the official Reserve emblem. Light, orbit and perspective belong to CSS layers
around the unmodified image; they do not alter its lettering or identity.

The Louisiana boundary used to build the dimensional map is extracted from the
Louisiana feature in [PublicaMundi's US states GeoJSON](https://github.com/PublicaMundi/MappingAPI/blob/master/data/geojson/us-states.json).
It is a stylized geographic silhouette, not surveying or navigation data.

Cormorant Garamond and Manrope are bundled through Fontsource; their license
files are included in their npm packages. Interface icons are from Lucide.

## September 26 founder artwork and collection previews

Neil supplied three emblem images and five product mockups for the cinematic homepage. The input files were named `.png` but contain JPEG data. The derived WebP files in `public/images/approved/` were converted with Sharp at quality 88; the source artwork, logos, labels, and packaging were not redrawn or relabeled. The original conversation attachments are the source of truth. Visual review should compare every rendered logo and label against them.

| Derived file | Supplied source | Usage |
| --- | --- | --- |
| `reserve-at-sanctum.webp` | `735.png` | Reserve host crest in arrival and footer |
| `fix-it-shop.webp` | `616.png` | Katie/Fix It Shop identity |
| `gent-ascend-collective.webp` | `796.png` | Neil/Gent Ascend Collective identity |
| `vitalis.webp` | `532.png` | Legacy Reserve Vitalis concept package |
| `ascend.webp` | `533.png` | Legacy Reserve ASCEND concept package |
| `hydros.webp` | `534.png` | Legacy Reserve HYDROS concept package |
| `obsidian-wash.webp` | `535.png` | Legacy Reserve Obsidian Wash concept package |
| `obsidian-creme.webp` | `536.png` | Legacy Reserve Obsidian Crème concept package |

The five images are product mockups, not verified photographs of retail stock. The site describes them as collection previews. No product purchase flow, live prices, stock status, or claims beyond the printed concept labels are inferred from these images. The environmental scenes remain concept imagery with visible labels until real location and founder photography can replace them. The unchanged hero composition retains its previous concept background; its Reserve emblem now uses the supplied crest.

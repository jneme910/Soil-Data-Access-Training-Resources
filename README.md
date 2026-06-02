# SDA Training Resources

## **[→ Visit the Training Site](https://jneme910.github.io/Soil-Data-Access-Training-Resources/)**

> A complete Beginner → Expert curriculum for SSURGO and the Soil Data Access REST API. Every lesson runs live against the real SDA database.

---

## Curriculum

| Track | Lessons | What you'll build |
|---|---|---|
| [🟢 Beginner SQL](https://jneme910.github.io/Soil-Data-Access-Training-Resources/beginner.html) | 5 | SELECT · WHERE · COUNT · dominant component queries |
| [🟡 Intermediate SQL](https://jneme910.github.io/Soil-Data-Access-Training-Resources/intermediate.html) | 5 | JOINs · GROUP BY · CTEs · Available Water Storage |
| [🔴 Expert SQL](https://jneme910.github.io/Soil-Data-Access-Training-Resources/expert.html) | 5 | Soil Organic Carbon formula · NCCPI · FSI · spatial AOI |
| [🔵 Python API](https://jneme910.github.io/Soil-Data-Access-Training-Resources/api-python.html) | 5 | requests · pandas · batch queries · matplotlib pipeline |
| [🟡 JavaScript API](https://jneme910.github.io/Soil-Data-Access-Training-Resources/api-javascript.html) | 5 | fetch() · live tables · MapLibre GL · SDAClient module |
| [⚗️ Query Lab](https://jneme910.github.io/Soil-Data-Access-Training-Resources/query-runner.html) | Live sandbox | 8 preloaded examples · run any SDA SQL instantly |
| [🔗 Data Model](https://jneme910.github.io/Soil-Data-Access-Training-Resources/soil-model.html) | Reference | Join chain · 134-table browser · live column lookup |

---

## The SSURGO Core Join

```sql
FROM legend l
INNER JOIN mapunit   mu ON mu.lkey  = l.lkey   -- survey area → map unit
INNER JOIN component  c ON c.mukey  = mu.mukey  -- map unit → soil type
LEFT  JOIN chorizon  ch ON ch.cokey = c.cokey   -- soil type → horizon layers
WHERE l.areasymbol = 'WI025'                    -- Dane County, Wisconsin
  AND c.majcompflag = 'Yes'                      -- dominant soil only
```

---

## Quick Example

```python
import requests

resp = requests.post(
    "https://sdmdataaccess.sc.egov.usda.gov/Tabular/post.rest",
    data={"query": "SELECT TOP 5 musym, muname FROM mapunit", "format": "JSON+COLUMNNAME"}
)
headers, _, *rows = resp.json()["Table"]
for row in rows:
    print(dict(zip(headers, row)))
```

---

## Companion

The [NRCS Soil Intelligence platform](https://jneme910.github.io/NRCS-Soil-Data-Access/) provides 258 production SQL scripts, interactive maps, and data journalism built on the same SSURGO database taught here.

---

## Official SDA Resources

- [SDA Query Interface](https://sdmdataaccess.nrcs.usda.gov/Query.aspx)
- [SDA QueryHelp](https://sdmdataaccess.nrcs.usda.gov/QueryHelp.aspx)
- [Tables & Columns Report](https://sdmdataaccess.nrcs.usda.gov/documents/TablesAndColumnsReport.pdf)
- [NCSS Lab Data Mart](https://ncsslabdatamart.sc.egov.usda.gov)

---

*USDA NRCS · SSURGO · Soil Data Access REST API · jneme910*

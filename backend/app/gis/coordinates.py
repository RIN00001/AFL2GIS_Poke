"""The only place where geographic coordinates become local scene meters."""
from pyproj import Transformer

SOURCE_CRS = 'EPSG:4326'
ANALYSIS_CRS = 'EPSG:32749'
ORIGIN_LON_LAT = (112.6315, -7.285631)
FORWARD = Transformer.from_crs(SOURCE_CRS, ANALYSIS_CRS, always_xy=True)
INVERSE = Transformer.from_crs(ANALYSIS_CRS, SOURCE_CRS, always_xy=True)
ORIGIN_E, ORIGIN_N = FORWARD.transform(*ORIGIN_LON_LAT)

def to_local(lon, lat):
    easting, northing = FORWARD.transform(lon, lat)
    return easting - ORIGIN_E, northing - ORIGIN_N

def to_lonlat(x, y):
    return INVERSE.transform(x + ORIGIN_E, y + ORIGIN_N)

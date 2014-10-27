import json
import pprint
import re
import time

from pymongo import MongoClient
import requests
import shapefile

pp = pprint.PrettyPrinter(indent=4)

db = MongoClient().postcodes

def main():
    with open('compiled-courts.json', 'r') as fhandle:
        courts = json.load(fhandle)
        fhandle.close()

    out_obj = []

    for courtname, court in courts.iteritems():
        is_bankruptcy = ('Bankruptcy' in [aol_obj['name'] for aol_obj in court['data']['areas_of_law']])
        has_postcodes = 'postcodes' in court['data']

        print courtname
        if has_postcodes and is_bankruptcy:
            postcodes = match_postcodes( court['data']['postcodes'] )

            out_obj.append({
                "name": courtname,
                "postcodes": postcodes
            })

    with open('court-lat-lon-postcode.json', 'w') as fhandle:
        json.dump(out_obj, fhandle, indent=4, separators=(',', ': '))
        fhandle.close()


def match_postcodes( postcodes ):
    out = []
    for postcode in postcodes:
        print "-->", postcode
        cache_hit = db.mapit_response_cache.find({ "postcode": postcode.lower().replace(' ', '') })
        if cache_hit.count() > 0:
            cache_hit = cache_hit.next()
            if "error" in cache_hit['response']:
                out.append({ "postcode": postcode, "lat": None, "lon": None })
            else:
                out.append({
                    "postcode": postcode,
                    "lat": cache_hit['response']['wgs84_lat'],
                    "lon": cache_hit['response']['wgs84_lon']
                })
        else:
            out.append({ "postcode": postcode, "lat": None, "lon": None })

    return out



def add_lat_lons():
    courts = get_court_postcodes()
    for courtname, court in courts.iteritems():
        if court['postcode'] is not None:
            postcode = re.sub(r'\s+', '', court['postcode'])
            if len(postcode) > 0:
                print postcode
                val = mapit(postcode)
                print val
                if val is not False:
                    courts[courtname]['lat'] = val['lat']
                    courts[courtname]['lon'] = val['lon']
                else:
                    courts[courtname]['lat'] = False
                    courts[courtname]['lon'] = False
            else:
                print "No postcode: ", courtname, postcode
        else:
            print "No postcode: ", courtname


    with open('compiled-courts.json', 'w') as fhandle:
        json.dump(courts, fhandle, indent=4, separators=(',', ': '))
        fhandle.close()


def mapit( postcode ):
    r = requests.get('http://mapit.mysociety.org/postcode/%s' % postcode)
    if r.status_code == 200:
        data = json.loads(r.text)
        return {
            "lat": data['wgs84_lat'],
            "lon": data['wgs84_lon']
        }
    else:
        if r.text.startswith('Rate limit'):
            print r.text, postcode, "sleeping..."
            time.sleep(30)
            return mapit(postcode)
        else:
            print r.text
            return False



def get_court_postcodes():
    courts = {}

    with open('search-courts.json', 'r') as fhandle:
        cfile = json.load(fhandle)
        fhandle.close()

    all_keys = set()
    for court in cfile:
        visiting = [address for address in court['addresses'] if address['type'] == 'Visiting']
        postal = [address for address in court['addresses'] if address['type'] == 'Postal']

        if visiting:
            postcode = visiting[0]['postcode']
        elif postal:
            postcode = postal[0]['postcode']
        else:
            postcode = None

        courts[court['name']] = {
            "postcode": postcode,
            "data": court
        }


    return courts

if __name__ == '__main__':
    main()

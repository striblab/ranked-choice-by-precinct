; /usr/bin/drake
;
; This file describes and performs the data processing
; workflow using Drake, a Make-like format focused on data.
; https://github.com/Factual/drake
;
; Full documentation (suggested to switch to Viewing mode)
; https://docs.google.com/document/d/1bF-OKNLIG10v_lMes_m4yyaJtAaJKtdK0Jizvi_MNsg/
;
; Suggested groups/tags of tasks:
; Download, Convert, Combine, Analysis, and Export
;
; Run with: drake -w data.workflow
;


; Base directory for all inputs and output
BASE=data


; EXAMPLE: Download file. Using the %download tag, we can download
; all things with drake %download
sources/2017-local-results-precincts.csv, %download <- [-timecheck]
  mkdir -p $BASE/sources
  wget -O $OUTPUT "ftp://media:results@ftp.sos.state.mn.us/20171107/localPrct.txt"

sources/2017-voting-preincts.zip, %download <- [-timecheck]
  mkdir -p $BASE/sources
  wget -O $OUTPUT "ftp://ftp.gisdata.mn.gov/pub/gdrs/data/pub/us_mn_state_sos/bdry_votingdistricts/shp_bdry_votingdistricts.zip"

; Extract
sources/2017-voting-preincts/bdry_votingdistricts.shp, %extract <- sources/2017-voting-preincts.zip
  mkdir -p $BASE/sources
  unzip $INPUT -o -d $BASE/sources/2017-voting-preincts
  touch $OUTPUT

; Convert
sources/2017-voting-preincts.geo.json, %convert <- sources/2017-voting-preincts/bdry_votingdistricts.shp
  ogr2ogr -f "GeoJSON" $OUTPUT $INPUT -t_srs "EPSG:4326"

; Process
build/st-paul-precincts-results.geo.json, build/minneapolis-precincts-results.geo.json, %process <- sources/2017-voting-preincts.geo.json, sources/2017-local-results-precincts.csv
  node $BASE/lib/results-process.js

; Copy files over
%copy <- build/st-paul-precincts-results.geo.json, build/minneapolis-precincts-results.geo.json
  mkdir -p assets/data/
  cp $BASE/build/* assets/data/


; Cleanup tasks
%sources.cleanup, %cleanup, %WARNING <-
  rm -rv $BASE/sources/*
%build.cleanup, %cleanup, %WARNING <-
  rm -rv $BASE/build/*

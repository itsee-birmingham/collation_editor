#-*- coding: utf-8 -*-
import xml.etree.ElementTree as etree
#from lxml import etree
import re
import codecs
import json

class Exporter(object): 
    
    def export_data(self, data, format, ignore_basetext=False):        
        output = []        
        for unit in data:
            if format == 'negative_xml':
                output.append(etree.tostring(self.get_unit_xml(unit, ignore_basetext, True), 'utf-8'))
            else:
                output.append(etree.tostring(self.get_unit_xml(unit, ignore_basetext), 'utf-8'))
        return '<?xml version=\'1.0\' encoding=\'utf-8\'?><TEI xmlns="http://www.tei-c.org/ns/1.0">%s</TEI>' % '\n'.join(output).replace('<?xml version=\'1.0\' encoding=\'utf-8\'?>', '')
 
    
    def get_text(self, reading, type=None):
        if type == 'subreading':
            return [reading['text_string']]
        if len(reading['text']) > 0:
            text = [' '.join(i['interface'].replace('_', u'\u0323') for i in reading['text'])]
        else:
            if 'overlap_status' in reading.keys() and (reading['overlap_status'] == 'deleted' or reading['overlap_status'] == 'overlapped'):
                text = ['', reading['overlap_status']]
            elif 'type' in reading.keys() and (reading['type'] == 'om_verse' or reading['type'] == 'om'):
                text = ['om', reading['type']]
            elif 'type' in reading.keys() and (reading['type'] == 'lac_verse' or reading['type'] == 'lac'):
                text = ['lac', reading['type']]                
        return text
    
    def get_witnesses(self, reading, missing):
        witnesses = ['%s%s' % (x, reading['suffixes'][i]) for i, x in enumerate(reading['witnesses'])]
        for miss in missing:
            if miss in witnesses:
                witnesses.remove(miss)
        return witnesses
    
    def make_reading(self, reading, i, label, witnesses, type=None):
        rdg = etree.Element('rdg')
        rdg.set('n', label)
        text = self.get_text(reading, type)
        if type:
            rdg.set('type', type)
        elif len(text) > 1:
            rdg.set('type', text[1])
        rdg.text = text[0]
        pos = i+1
        rdg.set('varSeq', '%s' % pos)
        if len(witnesses) > 0:
            rdg.set('wit', ' '.join(witnesses))
            wit = etree.Element('wit')
            for witness in witnesses:
                idno = etree.Element('idno')
                idno.text = witness
                wit.append(idno)
            rdg.append(wit)
        return rdg
    
    def get_unit_xml(self, entry, ignore_basetext, negative_apparatus=False):
        context = entry['context']
        basetext_siglum = entry['structure']['overtext'][0]['id']

        apparatus = entry['structure']['apparatus'][:]
        #make sure we append lines in order
        ordered_keys = [];
        for key in entry['structure']:
            if re.match('apparatus\d+', key) != None: 
                ordered_keys.append(int(key.replace('apparatus', '')))
        ordered_keys.sort() 
        
        for num in ordered_keys:
            apparatus.extend(entry['structure']['apparatus%d' % num])
            
        vtree = etree.fromstring('<ab xml:id="%s-APP"></ab>' % (context))
        #here deal with the whole verse lac and om and only use witnesses elsewhere not in these lists
        app = etree.fromstring('<app type="lac" n="%s"><lem wit="editorial">Whole verse</lem></app>' % (context))
        if len(entry['structure']['lac_readings']) > 0:
            rdg = etree.Element('rdg')
            rdg.set('type', 'lac')
            rdg.text = 'Def.'
            lac_witnesses = entry['structure']['lac_readings']
            rdg.set('wit', ' '.join(lac_witnesses))
            wit = etree.Element('wit')
            for witness in lac_witnesses:
                idno = etree.Element('idno')
                idno.text = witness
                wit.append(idno)
            rdg.append(wit)
            app.append(rdg)
        if len(entry['structure']['om_readings']) > 0:
            rdg = etree.Element('rdg')
            rdg.set('type', 'lac')
            rdg.text = 'Om.'
            om_witnesses = entry['structure']['om_readings']
            rdg.set('wit', ' '.join(om_witnesses))
            wit = etree.Element('wit')
            for witness in om_witnesses:
                idno = etree.Element('idno')
                idno.text = witness
                wit.append(idno)
            rdg.append(wit)
            app.append(rdg)
        vtree.append(app)
        missing = []
        missing.extend(entry['structure']['lac_readings'])
        missing.extend(entry['structure']['om_readings'])
        if ignore_basetext: #if we are ignoring the basetext add it to our missing list so it isn't listed (except n lemma)
            missing.append(basetext_siglum)
        apparatus = sorted(apparatus, key=lambda d: (d['start'])) #just sort by start so we preserve the editors order of overlap lines
        for unit in apparatus:
            start = unit['start']
            end = unit['end']
            app = etree.fromstring('<app type="main" n="%s" from="%s" to="%s"></app>' % (context, start, end))
            lem = etree.Element('lem')
            lem.set('wit', basetext_siglum)
            text = self.get_text(unit['readings'][0])
            lem.text = text[0]
            if len(text) > 1:
                lem.set('type', text[1])
            app.append(lem)
            readings = False
            for i, reading in enumerate(unit['readings']):   
                wits = self.get_witnesses(reading, missing)
                if negative_apparatus == True:                    
                    if (len(wits) > 0 or reading['label'] == 'a') and ('overlap_status' not in reading or reading['overlap_status'] not in ['overlapped', 'deleted']):   
                        if reading['label'] == 'a':
                            wits = []
                        if len(wits) > 0:
                            readings = True   
                        app.append(self.make_reading(reading, i, reading['label'], wits))
                    if 'subreadings' in reading:
                        for key in reading['subreadings']:
                            for subreading in reading['subreadings'][key]:
                                wits = self.get_witnesses(subreading, missing)
                                if len(wits) > 0:
                                    readings = True
                                    app.append(self.make_reading(subreading, i, '%s%s' % (reading['label'], subreading['suffix']), wits, 'subreading'))
                else:
                    if (len(wits) > 0 or reading['label'] == 'a') and ('overlap_status' not in reading or reading['overlap_status'] not in ['overlapped', 'deleted']):  
                        if len(wits) > 0:
                            readings = True           
                        app.append(self.make_reading(reading, i, reading['label'], wits))
                    if 'subreadings' in reading:
                        for key in reading['subreadings']:
                            for subreading in reading['subreadings'][key]:
                                wits = self.get_witnesses(subreading, missing)
                                if len(wits) > 0:
                                    readings = True
                                    app.append(self.make_reading(subreading, i, '%s%s' % (reading['label'], subreading['suffix']), wits, 'subreading'))
                
            if readings:
                vtree.append(app)

        return vtree
    
       
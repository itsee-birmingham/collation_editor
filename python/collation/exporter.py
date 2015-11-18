#-*- coding: utf-8 -*-
import xml.etree.ElementTree as etree
#from lxml import etree
import re
import codecs
import json

class Exporter(object): 
    
    def export_data(self, data, format):
        if format == 'xml':
            output = []
            for unit in data:
                output.append(etree.tostring(self.get_unit_xml(unit), 'utf-8'))
            return '<?xml version=\'1.0\' encoding=\'utf-8\'?><TEI xmlns="http://www.tei-c.org/ns/1.0">%s</TEI>' % '\n'.join(output).replace('<?xml version=\'1.0\' encoding=\'utf-8\'?>', '')
    
    def get_text(self, reading, type=None):
        if type == 'subreading':
            return reading['text_string']
        if len(reading['text']) > 0:
            text = ' '.join(i['interface'].replace('_', u'\u0323') for i in reading['text'])
        else:
            if 'overlap_status' in reading.keys() and (reading['overlap_status'] == 'deleted' or reading['overlap_status'] == 'overlapped'):
                text = ''
            elif 'type' in reading.keys() and (reading['type'] == 'om_verse' or reading['type'] == 'om'):
                text = 'om'
            elif 'type' in reading.keys() and (reading['type'] == 'lac_verse' or reading['type'] == 'lac'):
                text = 'lac'                
        return text
    
    def get_witnesses(self, reading):
        return ['%s%s' % (x, reading['suffixes'][i]) for i, x in enumerate(reading['witnesses'])]
    
    def make_reading(self, reading, i, label, type=None):
        witnesses = self.get_witnesses(reading)
        rdg = etree.Element('rdg')
        rdg.set('n', label)
        if type:
            rdg.set('type', type)
        rdg.text = self.get_text(reading, type)
        pos = i+1
        rdg.set('varSeq', '%s' % pos)
        rdg.set('wit', ' '.join(witnesses))
        wit = etree.Element('wit')
        for witness in witnesses:
            idno = etree.Element('idno')
            idno.text = witness
            wit.append(idno)
        rdg.append(wit)
        return rdg
    
    def get_unit_xml(self, entry):
        context = entry['context']
        overtext_id = entry['structure']['overtext'][0]['id']
        apparatus = entry['structure']['apparatus']
        for key in entry['structure']:
            if re.match('apparatus\d+', key) != None: #given that David has ordered this we probably want to process in order!
                apparatus.extend(entry['structure'][key])

        vtree = etree.fromstring('<ab xml:id="%s-APP"></ab>' % (context))
        apparatus = sorted(apparatus, key=lambda d: (d['start'], d['end']))
        for unit in apparatus:
            start = unit['start']
            end = unit['end']
            app = etree.fromstring('<app type="main" n="%s" from="%s" to="%s"></app>' % (context, start, end))
            lem = etree.Element('lem')
            lem.set('wit', overtext_id)
            lem.text = self.get_text(unit['readings'][0])
            app.append(lem)
            for i, reading in enumerate(unit['readings']):                
                app.append(self.make_reading(reading, i, reading['label']))
                if 'subreadings' in reading:
                    for key in reading['subreadings']:
                        for subreading in reading['subreadings'][key]:
                            app.append(self.make_reading(subreading, i, '%s%s' % (reading['label'], subreading['suffix']), 'subreading'))
            vtree.append(app)
        return vtree
    
       
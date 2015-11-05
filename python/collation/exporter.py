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
            print(len(data))
            for unit in data:
                print(unit)
                output.append(self.get_unit_xml(unit))
            return '<?xml version=\'1.0\' encoding=\'utf-8\'?><TEI>%s</TEI>' % '\n'.join(output).replace('<?xml version=\'1.0\' encoding=\'utf-8\'?>', '')
    
    def get_text(self, reading):
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
    
    def get_unit_xml(self, entry):
        context = entry['context']
        overtext_id = entry['structure']['overtext'][0]['id']
        apparatus = entry['structure']['apparatus']
        for key in entry['structure']:
            if re.match('apparatus\d+', key) != None:
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
                rdg = etree.Element('rdg')
                rdg.set('n', reading['label'])
                rdg.text = self.get_text(reading)
                pos = i+1
                rdg.set('varSeq', '%s' % pos)
                rdg.set('wit', ' '.join(reading['witnesses']))
                app.append(rdg)
                wit = etree.Element('wit')
                for witness in reading['witnesses']:
                    idno = etree.Element('idno')
                    idno.text = witness
                    wit.append(idno)
                rdg.append(wit)
            vtree.append(app)
        return etree.tostring(vtree, 'utf-8')
    
       
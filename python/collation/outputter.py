#-*- coding: utf-8 -*-
import xml.etree.ElementTree as etree
#from lxml import etree
import re
import codecs
import json

class Outputter(object): 
    
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
    
    def format_unit(self, entry=None, context='test'):
        
        overtext_id = entry['overtext'][0]['id']
        apparatus = entry['apparatus']
        for key in entry:
            if re.match('apparatus\d+', key) != None:
                apparatus.extend(entry[key])

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
        return etree.tostring(vtree, 'utf=8')
    
    def format_XML(self, data=None):
        book = 4
        chapter = 1
        verse = 1
        if not data:
            data = []
            string = codecs.open('/srv/itsee/static/data/project/default/user/default/collation/approved/B04K1V1.json', 'r', encoding='utf-8').read()
            data.append(json.loads(string))
            print(data[0].keys())
        apptree = etree.fromstring('<TEI></TEI>')
        for entry in data:
            overtext_id = entry['structure']['overtext'][0]['id']
            apparatus = entry['structure']['apparatus']
            for key in entry['structure']:
                if re.match('apparatus\d+', key) != None:
                    apparatus.extend(entry['structure'][key])

            vtree = etree.fromstring('<ab xml:id="%s-APP"></ab>' % (entry['context']));
            apparatus = sorted(apparatus, key=lambda d: (d['start'], d['end']))
            for unit in apparatus:
                start = unit['start']
                end = unit['end']
                app = etree.fromstring('<app type="main" n="%s" from="%s" to="%s"></app>' % (entry['context'], start, end))
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
                    #TODO: sort witnesses
                    rdg.set('wit', ' '.join(reading['witnesses']))
                    app.append(rdg)
                    wit = etree.Element('wit')
                    for witness in reading['witnesses']:
                        idno = etree.Element('idno')
                        idno.text = witness
                        wit.append(idno)
                    rdg.append(wit)
                vtree.append(app)
            if len(apptree.xpath('//div[@type="chapter"][@xml:id="B%sK%s-APP"]' % (book, chapter), namespaces={'tei':'http://www.tei-c.org/ns/1.0', 'xml': 'http://www.w3.org/XML/1998/namespace'})) > 0:
                apptree.xpath('//div[@type="chapter"][@xml:id="B%sK%s-APP"]' % (book, chapter), namespaces={'tei':'http://www.tei-c.org/ns/1.0', 'xml': 'http://www.w3.org/XML/1998/namespace'})[0].append(vtree)
            elif len(apptree.xpath('//div[@type="book"][@xml:id="B%s-APP"]' % (book), namespaces={'tei':'http://www.tei-c.org/ns/1.0', 'xml': 'http://www.w3.org/XML/1998/namespace'})) > 0:    
                chap = etree.Element('div')
                chap.set('type', 'chapter')
                chap.set('{http://www.w3.org/XML/1998/namespace}id', 'B%sK%s-APP' % (book, chapter))
                chap.append(vtree)
                apptree.xpath('//div[@type="book"][@xml:id="B%s-APP"]' % (book), namespaces={'tei':'http://www.tei-c.org/ns/1.0', 'xml': 'http://www.w3.org/XML/1998/namespace'}).append(chap)
            else:
                bk = etree.Element('div')
                bk.set('type', 'book')
                bk.set('{http://www.w3.org/XML/1998/namespace}id', 'B%s-APP' % (book))
                chap = etree.Element('div')
                chap.set('type', 'chapter')
                chap.set('{http://www.w3.org/XML/1998/namespace}id', 'B%sK%s-APP' % (book, chapter))
                chap.append(vtree)
                bk.append(chap)
                apptree.append(bk)
        apptree.xpath('//TEI')[0].set('xmlns', "http://www.tei-c.org/ns/1.0")
        
        return (etree.tounicode(apptree))
        
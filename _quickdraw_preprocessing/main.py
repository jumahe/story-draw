from quickdraw import QuickDrawData
import json
import io

cat_file = "categories.txt"

qd = QuickDrawData(recognized=True, max_drawings=1000, refresh_data=False, jit_loading=True, print_messages=True, cache_dir='./quickdrawcache')

data_out = {}
data_out["categories"] = {}
data_categories = data_out["categories"]

cat_list_f = open(cat_file, encoding="utf-8")
lines = cat_list_f.readlines()
print(len(lines))

for line in lines:
   line = line.rstrip('\n')
   data_categories[line] = {}
   cat_obj = data_categories[line]
   cat_obj["drawings"] = []
   drawings = cat_obj["drawings"]
   for i in range(3):
      content = qd.get_drawing(line)
      drawing = {}
      drawing["id"] = content.key_id
      drawing["nb_strokes"] = content.no_of_strokes
      drawing["strokes"] = content.strokes
      drawings.append(drawing)

with io.open('quickdraw.json','w', encoding='utf8') as outfile:
   data = json.dumps(data_out, ensure_ascii=False, sort_keys=True, indent=1)
   outfile.write(data)
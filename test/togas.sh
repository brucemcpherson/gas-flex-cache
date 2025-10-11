
TARGET="gasstaging"

# Define the input folder
SOURCE="."

# a spec to match extension
EXT="*.js"

# whether to push with clasp
CLASP=true

# the soure appsscript.json manifest should be in the top level 
cp ${SOURCE}/appsscript.json ${TARGET}
cp ${SOURCE}/imports.js ${TARGET}
cp -r ${SOURCE}/src/*.js ${TARGET}



# find all the copied files and comment/fixes out import and export statements
# Perl should work across platforms
find "${TARGET}" -name "${EXT}" -type f -exec perl -i -pe 's/^\s*export\s\s*//g' {} \;
find "${TARGET}" -name "${EXT}" -type f -exec perl -i -pe 'if (/^import\b/) { $in_import=1 } if ($in_import) { s/^/\/\//; if (/['\''"][^'\''"]*['\''"];?\s*$/) { $in_import=0 } }' {} +


# now go to the target and push and open if required
if [ "$CLASP" = true ] ; then
  cd "${TARGET}"
  clasp push
fi
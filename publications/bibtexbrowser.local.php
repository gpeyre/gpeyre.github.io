<?php
// ------------------------------- NOVICE LEVEL
// if your bibtex file is utf-8 encodedd
// define("ENCODING","utf-8");

// number of bib items per page
define('PAGE_SIZE',200);

// disable Javascript progressive enhancement
// define('BIBTEXBROWSER_USE_PROGRESSIVE_ENHANCEMENT',false);


// see the other define(...) in the source, they are all overridable

// ------------------------------- INTERMEDIATE LEVEL

define('BIBLIOGRAPHYSTYLE','MyFancyBibliographyStyle');
function MyFancyBibliographyStyle(&$bibentry) {
  $title = $bibentry->getTitle();
  $type = $bibentry->getType();

  // later on, all values of $entry will be joined by a comma
  $entry=array();

  // title
  // usually in bold: .bibtitle { font-weight:bold; }
  $title = '<span class="bibtitle">'.$title.'</span>';
  if ($bibentry->hasField('url')) $title = ' <a href="'.$bibentry->getField("url").'">'.$title.'</a>';
  

  // author
  if ($bibentry->hasField('author')) {
    $coreInfo = $title . ' <span class="bibauthor">('.$bibentry->getFormattedAuthorsImproved().')</span>';}
  else $coreInfo = $title;

  // core info usually contains title + author
  $entry[] = $coreInfo;

  // now the book title
  $booktitle = '';
  if ($type=="inproceedings") {
      $booktitle = $bibentry->getField(BOOKTITLE); }
  if ($type=="incollection") {
      $booktitle = $bibentry->getField(BOOKTITLE);}
  if ($type=="inbook") {
      $booktitle = $bibentry->getField('chapter');}
  if ($type=="article") {
      $booktitle = $bibentry->getField("journal");}
  if (($type=="misc") && $bibentry->hasField("note")) {
    $booktitle = $bibentry->getField("note");}

  //// we may add the editor names to the booktitle
  $editor='';
  if ($bibentry->hasField(EDITOR)) {
    $editor = $bibentry->getFormattedEditors();
  }
  if ($editor!='') $booktitle .=' ('.$editor.')';
  // end editor section

  // is the booktitle available
  if ($booktitle!='') {
    $entry[] = '<span class="bibbooktitle">'.$booktitle.'</span>';
  }


  $publisher='';
  if ($type=="phdthesis") {
      $publisher = 'PhD thesis, '.$bibentry->getField(SCHOOL);
  }
  if ($type=="mastersthesis") {
      $publisher = 'Master\'s thesis, '.$bibentry->getField(SCHOOL);
  }
  if ($type=="bachelorsthesis") {
      $publisher = 'Bachelor\'s thesis, '.$bibentry->getField(SCHOOL);
  }
  if ($type=="techreport") {
      $publisher = 'Technical report, '.$bibentry->getField("institution");
  }
  
  if ($type=="misc") {
      $publisher = $bibentry->getField('howpublished');
  }

  if ($bibentry->hasField("publisher")) {
    $publisher = $bibentry->getField("publisher");
  }

  if ($publisher!='') $entry[] = '<span class="bibpublisher">'.$publisher.'</span>';


  if ($bibentry->hasField('volume'))
  {   
  	$s = $bibentry->getField("volume");
  	if ($bibentry->hasField('number')) 
  		$s = $s . '(' . $bibentry->getField("number") . ')';
   	$entry[] =  "vol. ".$s;
  } 

 
	if ($bibentry->hasField('pages')) 
	{ 
	 	$s = $bibentry->getField("pages"); 
	 	$s = str_replace('--', '-', $s);
	 	$entry[] =  "pp. " . $s;
	} 

  if ($bibentry->hasField(YEAR)) $entry[] = $bibentry->getYear();

  $result = implode(", ",$entry).'.';

  // some comments (e.g. acceptance rate)?
  if ($bibentry->hasField('comment')) {
      $result .=  " (".$bibentry->getField("comment").")";
  }
  if ($bibentry->hasField('note')) {
      $result .=  " (".$bibentry->getField("note").")";
  }

  // add the Coin URL
  $result .=  "\n".$bibentry->toCoins();

  return $result;
}

?>
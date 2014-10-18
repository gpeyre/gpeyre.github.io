<?php
	include "../tools.php";
	ParseArguments( $argv );
	$Title="Publications";
	include "../header.php";
?>

<link rel="stylesheet" type="text/css" href="bibtexbrowser.css" />


Browse by categories: 
<ul>
<li><a href="?bib=peyre-biblio-string.bib;peyre-biblio-articles.bib;peyre-biblio-book.bib;peyre-biblio-bookchap.bib;peyre-biblio-conf-en.bib;peyre-biblio-conf-fr.bib;peyre-biblio-preprint.bib">All, uncategorized.</a></li>
<!--
	<li><a href="?academic=peyre&bib=peyre-biblio-articles.bib;peyre-biblio-book.bib;peyre-biblio-bookchap.bib;peyre-biblio-conf-en.bib;peyre-biblio-conf-fr.bib;peyre-biblio-preprint.bib">All, categorized.</a></li>
-->
<li><a href="?bib=peyre-biblio-string.bib;peyre-biblio-articles.bib">Journal articles.</a></li>
<li><a href="?bib=peyre-biblio-string.bib;peyre-biblio-preprint.bib">Preprints.</a></li>
<li><a href="?bib=peyre-biblio-string.bib;peyre-biblio-conf-en.bib">Proceedings of international conferences.</a></li>
<li><a href="?bib=peyre-biblio-string.bib;peyre-biblio-book.bib">Books.</a></li>
<li><a href="?bib=peyre-biblio-string.bib;peyre-biblio-bookchap.bib">Book chapters.</a></li>
<li><a href="?bib=peyre-biblio-string.bib;peyre-biblio-conf-fr.bib">Proceedings of french conferences.</a></li>
</ul>
<br/>

<?php

if( !(isset( $_GET['bib'] )) )
	$_GET['bib']="peyre-biblio-string.bib;peyre-biblio-articles.bib;peyre-biblio-book.bib;peyre-biblio-bookchap.bib;peyre-biblio-conf-en.bib;peyre-biblio-conf-fr.bib;peyre-biblio-preprint.bib";

// http://www.ceremade.dauphine.fr/~peyre/publications-php/bibtexbrowser.php?frameset&bib=peyre-biblio-articles.bib;peyre-biblio-book.bib;peyre-biblio-bookchap.bib;peyre-biblio-conf-en.bib;peyre-biblio-conf-fr.bib;peyre-biblio-preprint.bib
// ;peyre-biblio-book.bib;peyre-biblio-bookchap.bib;peyre-biblio-conf-en.bib;peyre-biblio-conf-fr.bib;peyre-biblio-preprint.bib'; 
// $_GET['academic']='Peyre'; 
//$_GET['author']='Peyre';

$_GET['all']=1; 
include( 'bibtexbrowser.php' ); 
?>


<?php include "../footer.php" ?>
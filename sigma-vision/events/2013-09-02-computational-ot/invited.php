<?php 

function genname($link, $name, $affil)
{ 
 	$gen='<a href="' . $link . '">' . $name . '</a> (' . $affil . ')';
 	return $gen;
}

$Cuturi = genname('http://www.i.kyoto-u.ac.jp/~mcuturi', 'Marco Cuturi', 'Kyoto University');
$Merigot = genname('http://quentin.mrgt.fr/', 'Quentin M&eacute;rigot', 'CNRS and Universit&eacute; de Grenoble');
$Pele = genname('http://www.seas.upenn.edu/~ofirpele/', 'Ofir Pele', 'University of Pennsylvania');
$Schmitzer = genname('http://graphmod.iwr.uni-heidelberg.de/Bernhard-Schmitzer.103.0.html', 'Bernhard Schmitzer', 'University of Heidelberg');



?>
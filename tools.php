<?php

function ConnectToDatabase()
{
	mysql_connect( "localhost", "nikopol0", "orion3d4ever" ) or die ("Impossible de se connecter");
    @mysql_select_db( "nikopol0db" ) or die ("Impossible d'accéder à la base de données");
}

function GetDirArray($sPath)
{
	$retVal = array();
	//Load Directory Into Array
	$handle=opendir($sPath);
	while ($file = readdir($handle))
        $retVal[count($retVal)] = $file;

	//Clean up and sort
	closedir($handle); 	
	sort($retVal);
	return $retVal;
}

/* output tout ce qui est dans <body>...</body> */
function IncludeHTML($page)
{
	$fcontents = join( '', file( $page ) );
	$regexp = '(^.*<html[^>]*>.*<body[^>]*>)|(</body[^>]*>.*</html[^>]*>.*$)';
	echo eregi_replace($regexp, '', $fcontents);
}

function DisplayFileSize( $file_name )
{
	$stat= stat( $file_name );
	$taille = $stat[7]/1024;
	if( $taille<1000 )
		printf("%0.0f Ko" , $taille);
	else
		printf("%0.1f Mo" , $taille/1024);
}

function MakeDownloadRow($base_name, $base_path, $file_list, $titre, $auteur, $comment)
{
		/* les différents format disponible */
		$format = array();
		if( in_array($base_name . ".ps", $file_list) )
			$format[] = "ps";
		if( in_array($base_name . ".pdf", $file_list) )
			$format[] = "pdf";
		if( in_array($base_name . ".dvi", $file_list) )
			$format[] = "dvi";
		if( in_array($base_name . ".tex", $file_list) )
			$format[] = "tex";
		if( in_array($base_name . ".bib", $file_list) )
			$format[] = "bib";
		if( in_array($base_name . ".html", $file_list) )
			$format[] = "html";
		if( in_array($base_name . ".htm", $file_list) )
			$format[] = "htm";
		if( in_array($base_name . ".zip", $file_list) )
			$format[] = "zip";
		if( in_array($base_name . ".mws", $file_list) )
			$format[] = "mws";
		if( in_array($base_name . ".xml", $file_list) )
			$format[] = "xml";
		if( in_array($base_name, $file_list) )
			$format[] = "showhtml";
		$nbr_formats = sizeof($format);
		if( $nbr_formats>0 )
		{
			echo "<tr>";

			/* les formats */
			echo "<td CLASS=\"articlelink\" width=\"90\">";
			echo "<table>";
			echo "<tr>";
			for( $i=0; $i<$nbr_formats; $i++ )
			{
				/* regroupe les icones par 2 */
				if( ($i%2)==0 && ($i!=0) )
					echo "</tr><tr>";

				$file_name = $base_path . $base_name . "." . $format[$i];
                                if( $format[$i]=="showhtml" )
                                        $file_name = $base_path . $base_name . "/";

				echo "<td>";
					/* le link */
			  		echo "<A HREF=\"" . $file_name . "\">";
    						echo "<img src=\"/images/" . $format[$i] . ".gif\"  CLASS=\"articlethumb\" alt=\"download\"/>";
					echo "</A>";
					echo "<br/>";
					/* la taille */
					echo "<font size=\"1\">";
					DisplayFileSize($file_name);
					echo "</font>";
				echo "</td>";
			}
			echo "</tr>";
			echo "</table>";
			echo "</td>";
			/* le titre */
			if( $titre!="" ) 
	        	echo "<td CLASS=\"articletitre\"  width=\"15%\" >" . $titre . "</td>";
			if( $auteur!="" )
				echo "<td CLASS=\"articleauteur\"  width=\"15%\" >" . $auteur . "</td>";
			if( $comment!="" )
				echo "<td CLASS=\"articlecomment\" >" . $comment . "</td>";
            echo "</tr>";
		}
}

/* Php change : set the $argv and $argv */
$argv = 'dump'; // $_SERVER["argv"]; 
$argc = 'dump'; // $_SERVER["argc"];

/* analyse des arguments */
$page_arguments = array();
$lang = "fr";
$use_default_lang = true;

/* gestion des stylesheet CSS */
$css_stylsheet = "/style1.css";

function ParseArguments( $arguments_list )
{
	global $page_arguments, $lang, $HTTP_COOKIE_VARS, $use_default_lang, $css_stylsheet;
	$arguments = array();
	if( sizeof($arguments_list)>0 )
		$arguments = explode("&", $arguments_list[0]);
	foreach( $arguments as $argument )
	{
		$arg = explode("=", $argument);
		if( sizeof( $arg )>1 )
		{
			$page_arguments[$arg[0]] = $arg[1];
		}
	}
	/* calcule de la langue ***************************************/
	$cookie_name = "nikopol0_lang";
	$cookie_path = "/nikopol0/";
	$cookie_hostname = "localhost";
	
	if( isset( $page_arguments["lang"] ) )
	{
		$use_default_lang = false;
		$lang = $page_arguments["lang"];
		/* envoie d'un cookie */
		$cookie_life = time() + 3600;
		setcookie($cookie_name, $lang, $cookie_life ); 
	}
	else
	{
		/* on essaie de récupérer la langue par un cookie */
		if( isset( $HTTP_COOKIE_VARS[$cookie_name] ) )
		{
			$lang = $HTTP_COOKIE_VARS[$cookie_name];
			$use_default_lang = false;
		}
	}
	/* calcule du skin ***************************************/
	$cookie_name = "nikopol0_skin";
	$cookie_path = "/nikopol0/";
	$cookie_hostname = "localhost";
	
	if( isset( $page_arguments["skin"] ) )
	{
		$skin = $page_arguments["skin"];
		$css_stylsheet = "/style" . $skin . ".css";
		/* envoie d'un cookie */
		$cookie_life = time() + 3600;
		setcookie($cookie_name, $skin, $cookie_life ); 
	}
	else
	{
		/* on essaie de récupérer la langue par un cookie */
		if( isset( $HTTP_COOKIE_VARS[$cookie_name] ) )
		{
			$skin = $HTTP_COOKIE_VARS[$cookie_name];
			$css_stylsheet = "/style" . $skin . ".css";
		}
	}
}

/* display text in the 2 languages */
function DisplayText( $fr_text, $eng_text )
{
	global $lang;
	if( $lang=="fr" )
		echo $fr_text;
	else if( $lang=="eng" )
		echo $eng_text;
	else
		echo "Unknown language.";
}

/* add link to common entities */
$link_references = array(
	"Orion3D" => "http://orion3d.alrj.org",
	"Alrj" => "http://www.alrj.org",
	"CNS" => "http://cns.free.fr/",
	"Antoche" => "http://orion3d.alrj.org",
	"DocBook" => "http://www.docbook.org/",
	"XSD" => "http://www.w3.org/XML/Schema/",
	"XMLSpy" => "http://www.xmlspy.com/",
	"XML" => "http://www.w3.org/XML/",
	"CSS" => "http://www.w3.org/Style/CSS/",
	"HTML" => "http://www.w3.org/MarkUp/",
	"MathML" => "http://www.w3.org/Math/",
	"PNG" => "http://www.w3.org/Graphics/PNG/",
	"XSL" => "http://www.w3.org/Style/XSL/",
	"XSLT" => "http://www.w3.org/Style/XSL/",
	"Sourceforge" => "http://sourceforge.net/",
	"LaTeX" => "http://www.latex-project.org/",
	"GPL" => "http://www.gnu.org/copyleft/gpl.html",
	"PHP" => "http://www.php.net",
	"OpenMathTag" => "http://openmathtag.sourceforge.net" 	
);
function AddUsefullLinks( $text, $target="_blank")
{
	global $link_references;
	$keys = array_keys( $link_references );
	for( $i=0; $i<sizeof($link_references); ++$i ) 
	{
		$entity = $keys[$i];
		$link = $link_references[$keys[$i]];
		$text = str_replace($entity . " ", "<a href=\"$link\" target=\"$target\">$entity</a> ", $text);
		$text = str_replace($entity . ".", "<a href=\"$link\" target=\"$target\">$entity</a>.", $text);
		$text = str_replace($entity . ",", "<a href=\"$link\" target=\"$target\">$entity</a>,", $text);
		$text = str_replace($entity . ")", "<a href=\"$link\" target=\"$target\">$entity</a>)", $text);
	}
	return $text;
}

?>
<?php
	/* calcule les méta informations */
	if( $lang == "fr" )
	{
		if( !isset($meta_content) )
			$meta_content = "La page personnelle de Gabriel Peyré.";
		if( !isset($meta_keywords) )
			$meta_keywords = "";
		$meta_keywords .= "Mathématiques, informatique";
	}
	else if( $lang=="eng" )
	{
		if( !isset($meta_content) )
			$meta_content = "Gabriel Peyré homepage.";
		if( !isset($meta_keywords) )
			$meta_keywords = "";
		$meta_keywords .= "Mathematics, informatics";
	}
	else
	{
		$meta_content = "Unknown language";
		$meta_keywords = "Unknown language";
	}
	$css_stylsheet = "/~peyre/style.css";
	$root = "/~peyre/";
	
	function menu_row($addr, $titre, $istitle)
	{
		if( $istitle==1 )
			$class = 'menutitle';
		else
			$class = 'menuitem';
		echo '<TR><TD CLASS="' . $class . '"><A class="menulink" HREF="' . $addr . '">'; 
		echo $titre; 
		echo '</A></TD></TR>';
	}
	function begin_menu()
	{
		echo '<BR/><TABLE WIDTH="100%" CLASS="menu">';
	}
	function end_menu()
	{
		echo '</TABLE>';
	}
?>

<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN">
<HTML>
<HEAD>
<META http-equiv="Content-Type" content="text/html; charset=iso-8859-1">
<META name="description" content=" <?php echo $meta_content; ?> ">
<META name="keywords" content=" <?php echo $meta_keywords; ?> ">
<META name="author" content="Gabriel Peyré">
<LINK REL="stylesheet" HREF="<?php echo $css_stylsheet; ?>" TYPE="text/css">
<link rel="shortcut icon" type="image/png" href="<?php echo $root; ?>/images/favicon.png" />
<TITLE><?php echo $Title ?></TITLE>
</HEAD>
<BODY>

<TABLE><TR><TD CLASS="leftframe" VALIGN=TOP NOWRAP>
<?php		
	if( !isset($lang) )
		ParseArguments( $argv );
	$include_dir = "/";
	$my_email = "gabriel.peyre at ceremade.dauphine.fr";
?>


<?php
	begin_menu();
	menu_row($root, 'Home', 1);
	menu_row($root . 'publications/', 'Publications', 0); 
	menu_row('https://speakerdeck.com/gpeyre/', 'Talks', 0);
	menu_row($root . 'books/', 'Books', 0);
	menu_row($root . 'teaching/', 'Teaching', 0);
	end_menu();
		
	begin_menu();
	menu_row($root, 'Materials', 1);
	menu_row('http://www.numerical-tours.com', 'Numerical Tours', 0);
	menu_row($root . 'codes/', 'Codes', 0);
	end_menu();
	
	begin_menu();
	menu_row($root, 'Contact', 1);
	menu_row('mailto:gabriel.peyre at ceremade.dauphine.fr', 'E-mail', 0);
	menu_row($root . 'cv/', 'Resume', 0);
	end_menu();
	
	begin_menu();
	menu_row($root, 'Homepages', 1); 
	menu_row($root . 'sigma-vision/', '&Sigma;-Vision', 0);
	menu_row($root . 'natimages/', 'Natimages', 0);
	menu_row('https://fadili.users.greyc.fr/mia/', 'GdR MIA', 0);
	menu_row('http://gtstatimage.weebly.com', 'GT Stat/Image', 0);
	menu_row('http://chaire-end.weebly.com/', 'Chaire END', 0);
	end_menu();
	
?>

</TD>

<TD width="50">&nbsp;&nbsp;</td>

<TD WIDTH="99%" VALIGN=TOP>
<p CLASS="pagetitle">
<?php
	if( !isset($Output_Title) || $Output_Title==true )
		echo htmlentities( $Title );
?>
</p>
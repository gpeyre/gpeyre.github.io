<?php
	include "invited.php";
	
	function speaker($name)
	{
		echo $name . '</br>';		
	}
	function sponsor($name, $web)
	{
		echo "<a href=$web>$name</a><br/>";
	}
	function begin_block($title)
	{
		echo "<h2 align=center>$title</h2><p align=center>";
	}
	function end_block()
	{
		echo "</p>";
	}
	function program_line($time, $text)
	{
		echo "<li>$time - $text</li>";
	}
	
	function resume($author, $titre, $resume)
	{
		echo "<blockquote>";
		echo "<table bgcolor=#C0C0C0 width=80% align=center border=1 cellpadding=5 cellspacing=0>";
		echo "<tr><td align=center><b>$author</b></tr></td>";
		echo "<tr><td align=center><i>$titre</i></tr></td>";
		echo "<tr><td align=justify>$resume</tr></td>";
		echo "</table>";
		echo "</blockquote>";
	}
	
	$title = 'Workshop<br/> <i>Computational Optimal Transport</i>';
	$title_head = 'Workshop - Computational Optimal Transport</i>';
	$resume = 'The goal of this informal one day workshop is to present recent advances in the field of computational optimal transport. The focus is on the developpement of fast exact or approximate optimal transport methods, together with extensions of the basic notion of transport to take into account several specific features (regularity, tractability, etc).';
	$dates = '2 September 2013';
	$location = 'Institut Henri Poincar&eacute; (Paris, France)<br/>Amphith&eacute;&acirc;tre Darboux';
	$location_link = 'http://www.ihp.fr/';
	$location_img = 'images/ihp.jpg';
	$registration_link = 'https://docs.google.com/forms/d/1oJTWr2gil1AKP144iQp5W46ifhsBs1IsI-Tf1SGJU7A/viewform';
?>

<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.0 Transitional//EN">
<HTML><HEAD>
	<TITLE>
		<?php 
			echo $title_head;
		?>
	</TITLE>
<META http-equiv=Content-Type content="text/html">
<LINK REL="stylesheet" HREF="style.css" TYPE="text/css">
<meta name="google-translate-customization" content="bd506abdfe9936b8-f957e5108849f8ee-g45774036d79c50af-34"></meta>
</HEAD>
<BODY bgColor=#FFFFFF>

<table width="100%" border="0" cellspacing="0" cellpadding="1">
  <tr>
	<td background="images/frise.jpg" width="148pxl">&nbsp;</td>
		<td>
        	<div align="center">
				<font size="+3">
					<b>
                		<?php echo $title; ?>
            		</b>
				</font>
				
				<br/>
				
				<!-- MENU 
				<table width="60%" border="0" cellspacing="10" cellpadding="2">
                <tr> 
                  <td width="25%" height="20"> <div align="center">Program</div></td>
                   <td width="20%"><div align="center"><a href="https://docs.google.com/spreadsheet/viewform?formkey=dDhVSTQwc3B2em1ac2YwTGtKNGZSMlE6MA">Registration</a></div></td>
                  <td width="20%"><div align="center"><a href="../../ihp/">Location</a></div></td>
                  <td width="20%"><div align="center"><a href="images/flyer.pdf">Flyer</a></div></td>
                </tr>
              </table>
				-->
          </div>
          
            <blockquote>
              <blockquote>
                <blockquote>                  
					<p align="justify">
						<?php
							echo $resume;
						?>
					</p>
                </blockquote>
              </blockquote>
            </blockquote>          
            

		<?php 
		
			begin_block("Dates");
				echo $dates;
			end_block();
			
			
      		begin_block("Location");
				echo "<img src=$location_img width=400pxl/><br/><a href=$location_link>$location</a>";
			end_block();

			
			begin_block("Registration");
				echo "Registration is free but mandatory. <a href=$registration_link>Please go the registration page.</a>";
			end_block();

			/*
    		begin_block("Invited speakers");
				speaker($baraniuk);
				speaker($bertozzi);
				speaker($boykov);
				speaker($bredies);
			end_block();
			*/ 
			
			begin_block("Program");
				echo "<blockquote>";
				echo "<ul>";
					program_line("09:30-10:00", "Wellcome");
					program_line("10:00-11:00", $Cuturi);
					program_line("11:00-11:30", "Coffee break");
					program_line("11:30-12:30",  $Merigot);
					program_line("12:30-14:00", "Lunch");
					program_line("14:00-15:00", $Pele);
					program_line("15:00-15:30", "Coffee break");
					program_line("15:30-16:30", $Schmitzer);
				echo "</ul>";
				echo "</blockquote>";
			end_block();
			
			
			begin_block("R&eacute;sum&eacute;s");
			
				resume($Cuturi, "Sinkhorn Distances: Lightspeed Computation of Optimal Transportation Distances", "Optimal transportation distances are a fundamental family of parameterized distances for histograms. Despite their appealing theoretical properties, excellent performance in retrieval tasks and intuitive formulation, their computation involves the resolution of a linear program whose cost is prohibitive whenever the histograms' dimension exceeds a few hundreds. We propose in this work a new family of optimal transportation distances that look at transportation problems from a maximum-entropy perspective. We smooth the classical optimal transportation problem with an entropic regularization term, and show that the resulting optimum is also a distance which can be computed through Sinkhorn-Knopp's matrix scaling algorithm at a speed that is several orders of magnitude faster than that of transportation solvers. We also report improved performance over classical optimal transportation distances on the MNIST benchmark problem.");
			
				resume($Merigot, "Dual methods for optimal transport and computational geometry", "We will show how to implement dual methods for solving optimal transport using tools from computational geometry. In a first part, we will show how a sequence of simplification of the target measure can be used to improve the convergence results of quasi-Newton techniques for the dual functional. This leads to an efficient algorithm for solving optimal transport for the quadratic cost in the plane using the fast implementation of power diagrams in CGAL. In the second part, we will present an optimal transport problem on the sphere that arises from an inverse problem in geometric optics. Evaluating the dual functional requires fast computations of intersection of confocal paraboloids of revolution in 3D. We will show how to perform these computations efficiently and robustly, and present complexity bounds. This second part is a joint work with Pedro Machado Manhaes de Castro and Boris Thibert.");
				
				
				resume($Pele, "New Earth Mover's Distance Variants and Algorithms and their Applications", "Histogram distance functions are the cornerstone of numerous computer vision and machine learning tasks (e.g. image retrieval, descriptor matching and k-nearest neighbor classification). It is common practice to use distances such as the Euclidean and Manhattan norms to compare histograms. This practice assumes that the histogram domains are aligned. However, this assumption is violated through quantization, shape deformation, light changes, etc. The Earth Mover’s Distance (EMD) is a cross-bin distance that addresses this alignment problem. We present several new Earth Mover's Distance variants that are robust to outlier noise and global deformations. Additionally, we present efficient algorithms for their computation. We show state-of-the-art results for descriptor matching and image retrieval. These tools have already been used by other groups and demonstrated state-of-the-art results for a range of tasks such as superpixel matching, descriptor matching, image retargeting, image segmentation, social graph comparisons and population density comparison. ");
				
				resume($Schmitzer, "Hierarchical Optimal Transport for Shape Matching and Segmentation", "Optimal transport provides a powerful foundation for convex variational
				joint object segmentation and shape matching.
				Important challenges are regularity of the matching, statistical
				modelling of known shape deformations and invariance with respect to
				geometric transformations.
				Optimization of the corresponding functionals can be made feasible by
				exploiting hierarchical structures.");
				 
				
			end_block();
			
			begin_block("Sponsor");
				sponsor("ERC SIGMA-Vision", "https://www.ceremade.dauphine.fr/~peyre/sigma-vision/");
				sponsor("GdR MIA", "https://fadili.users.greyc.fr/mia/");
				sponsor("ANR  ISOTACE", "https://project.inria.fr/isotace/");
				sponsor("IHP", "http://www.ihp.fr/");
			end_block();
			
			
			
			?>
       		</p>
	</div>
	
	<!--
	<h2 align="center">Scientific committee</h2>
	<div align="center">
        <p>
		Jean-Francois Aujol (IMB, University Bordeaux 1) <br>
		Antonin Chambolle (CMAP, Ecole Polytechnique) <br>
		Laurent Cohen (CEREMADE, University Paris-Dauphine) <br>
		Agn&eacute;s Desolneux (CMLA, ENS de Cachan, France) <br>
		Joachim Weickert (Saarland University, Allemagne) <br>    
   		</p>
	</div>
	-->
		
	<!--
    <h2 align="center">Organizing committee</h2>
	<div align="center">
        <p>
			    <a href="https://fadili.users.greyc.fr/">Jalal Fadili (ENSICaen, France)</a></br>
			    <a href="http://www.math.tu-berlin.de/fachgebiete_ag_modnumdiff/angewandtefunktionalanalysis/v-menue/members/kutyniok/v-menue/home/parameter/en/">Gitta Kutyniok (TU Berlin, Germany)</a></br>
			    <a href="http://www.ceremade.dauphine.fr/~peyre/">Gabriel Peyr&eacute; (Paris-Dauphine, France)</a></br>
			    <a href="http://num.math.uni-goettingen.de/plonka/index-en.shtml">Gerlind Plonka-Hoch (University of G&ouml;ttingen, Germany)</a></br>
			    <a href="http://www.mathematik.uni-kl.de/imagepro/members/steidl/">Gabriele Steidl (TU Kaiserslautern, Germany)</a></br>
   		</p>
	</div>
	-->
	
	<!--

	<h2 align="center">Registration</h2>
	<div align="center">
    	<p>
    	TBA
					<strong>IMPORTANT:</strong> <a href="https://spreadsheets.google.com/spreadsheet/viewform?formkey=dEFBYlBhcG54TDdhMzAyNVhtcUE4NHc6MQ"><font color=Red>Registration</font></a> is free but mandatory
				before October 31.
			</p>
		</div>
		-->
	
               
	
	</td>
    <td background="images/frise2.jpg" width="180pxl">&nbsp;</td>
	</tr>
</table>
</body>
</html>

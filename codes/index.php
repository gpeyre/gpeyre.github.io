<?php 

	$Title="Codes"; 

	include "../tools.php";	

	ParseArguments( $argv );

	include "../header.php";
	
	
	function code($name, $authors, $hal, $file)
	{
		echo '<li>' . $name . ' (' . $authors . '): <br/>';
		echo '<a href="' . $hal . '">[Article] </a>';
		echo '<a href="' . $file . '">[Code]</a>';
		echo '</li>';		
	}
	function github($num)
	{
		$a = 'https://github.com/gpeyre/' . $num;
		return $a;
	}
	function hal($num)
	{
		$a = 'http://hal.archives-ouvertes.fr/hal-' . $num; 
		return $a;
	}
	function arxiv($num)
	{
		$a = 'http://arxiv.org/abs/' . $num;
		return $a;
	}

?>



<TABLE>
  <TBODY>
	<p>
		You can find below Matlab code to reproduce the figures of some of my articles. All the code are hosted on <a href="https://github.com/gpeyre">Github</a>, and you can retrieve them either as .zip file or as a git repository. 
	</p>
	
	
    <ul>
		<?php
		
			code('SUGAR', 'C. Deledalle', '', 'https://github.com/deledalle/sugar' );
			code('Variational Texture Synthesis with Sparsity and Spectrum Constraints', 'G. Tartavel, Y. Gousseau and G. Peyre', '', 'https://bitbucket.org/gtartavel/variational_synthesis');
			code('Sliced and Radon Wasserstein Barycenters of Measures', 'N. Bonneel, J. Rabin, G. Peyre, H. Pfister', hal('00881872'), github('2014-JMIV-SlicedTransport'));
			code('Finsler Steepest Descent with Applications to Piecewise-regular Curve Evolution', 'G. Charpiat, G. Nardi, G. Peyre, F-X. Vialard', hal('00839635'), github('2013-IFB-FinslerGradient') );
			code('Regularized Discrete Optimal Transport', 'S. Ferradans, N. Papadakis, G. Peyre, J-F. Aujol', arxiv('1307.5551'), github('2013-SIIMS-regularized-ot') );
			code('Synthesizing and Mixing Stationary Gaussian Texture Models', 'G-S. Xia, S. Ferradans, G. Peyre, J-F. Aujol', hal('00816342'), github('2013-SIIMS-gaussian-textures') );
            code('Optimal Transport with Proximal Splitting', 'N. Papadakis, G. Peyre, E. Oudet', hal('00816211'), github('2013-SIIMS-ot-splitting') );
            code('Adaptive estimation of the density matrix in quantum homodyne tomography with noisy data', 'P. Alquier, K.Meziani, G.Peyre', arxiv('1301.7644'), github('2012-IP-stats-quantic') );
			code('Non-local Active Contours', 'M. Jung, G. Peyre, L. Cohen', hal('00650735'), github('2012-SIIMS-nl-ac') );
			code('Approximation of Maximal Cheeger Sets by Projection', 'G. Carlier, M. Comte, G. Peyre', hal('00359736'), github('2009-M3AN-cheeger') );
			code('Derivatives with Respect to Metrics and Applications: Subgradient Marching Algorithm', 'F.  Benmansour, G. Carlier, G. Peyre, F. Santambrogio', hal('00360794'), github('2010-Numerische-SubGrad') );
			code('A Numerical Exploration of Compressed Sampling Recovery ', 'C. Dossal, G. Peyre, J. Fadili', hal('00402455'), github('2010-LAA-numerical-cs') );
			code('Total Variation Projection with First Order Schemes', 'J. Fadili, G. Peyre', hal('00380491'), github('2011-TIP-tv-projection') );
			code('Sharp Support Recovery from Noisy Random Measurements by L1 minimization', 'C. Dossal, M.L. Chabanol, G. Peyre, J. Fadili', hal('00553670'), github('2011-ACHA-support-ident') );
			code('Locally Parallel Texture Modeling', 'P. Maurel, J.F. Aujol, G. Peyre', hal('00415779'), github('2011-SIIMS-tv-hilbert') );
			code('Compressive Wave Computation', 'L. Demanet and G. Peyre', hal('00368919'), github('2011-FOCM-cwc') );
		?>
    </ul>
  </TBODY>
</TABLE>




<?php include "../footer.php" ?>




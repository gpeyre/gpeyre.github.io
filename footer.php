<?php
if(0)
{
    $FileName = "/var/www/htdocs".getenv( "SCRIPT_NAME" );
    $FileDate = filemtime( $FileName );
    echo "<BR><FONT SIZE=-2><I>Last modified ";
    echo date( "H:i d/m/Y", $FileDate );
    echo "</I></FONT>";
}
?>
</TD></TR>
</TABLE>

<script src="http://www.google-analytics.com/urchin.js" type="text/javascript">
</script>
<script type="text/javascript">
_uacct = "UA-781488-2";
urchinTracker();
</script>

<SCRIPT language=JavaScript type=text/javascript>
function DisplayPHPCode(dest) {
  phpcodeWindow=open(dest, "phpcode", "resizable=1,width=800,height=600");
  phpcodeWindow.focus();
}
</SCRIPT>


</BODY>
</HTML>
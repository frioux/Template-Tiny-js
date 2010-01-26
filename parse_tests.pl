#!perl
use strict;
use warnings;
use vars qw{$VAR1};

use feature ':5.10';
use JSON::XS;

my $json = {};
for my $file (<*.{tt,var,txt}>) {
   open my $fh, q{<}, $file;
   my ($part1,$type) = split /\./, $file;
   if ($type ne 'var') {
      $json->{$type}{$part1} = join q{}, <$fh>;
   } else {
      eval join q{}, <$fh>;
      $json->{expect}{$part1} = $VAR1;
   }
};
say 'var samples = ' .encode_json($json) . ';';

%%
% Script to exports the images from the database.

% load the data
listings_tableaux;

in_img = '../imgs/';
in_thumbs = '../thumbs/';

out_img = 'imgs/';
out_thumbs = 'thumbs/';
if not(exist(out_img))
    mkdir(out_img);
    mkdir(out_thumbs);
end

for i=1:length(L)
    fid = fopen([names{i} '.yml'], 'wt');
    a = L{i};
    for j=1:length(a)
        u = a{j};
        if not(isstr(u))
            u = num2str(u);
        end
        % copy image file
        copyfile([in_img u '.jpg'],[out_img u '.jpg']);
        copyfile([in_thumbs u '.jpg'],[out_thumbs u '.jpg']);
        % check orient
        img = imread([in_thumbs u '.jpg']);
        if size(img,1)>size(img,2)
            or = 'V';
        else
            or = 'H';
        end
        % generate tag
        fprintf(fid, ['- id: ' u '\n']);
        fprintf(fid, ['  name: --\n']);
        fprintf(fid, ['  orient: ' or '\n']);
    end
    fclose(fid);
end
